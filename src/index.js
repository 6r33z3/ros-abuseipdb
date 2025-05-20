const https = require('https');
const fs = require('fs');
const path = require('path');

// Configuration
const LIST_NAME = `abuseipdb-s100-1d`;
const OUTPUT_DIR = 'build';
const OUTPUT_FILE = path.join(OUTPUT_DIR, `${LIST_NAME}.rsc`);
const SOURCE_URL = `https://raw.githubusercontent.com/borestad/blocklist-abuseipdb/refs/heads/main/${LIST_NAME}.ipv4`;

// Helper function to format current date and time
function getFormattedDateTime() {
    const now = new Date();
    return now.toISOString().replace('T', ' ').split('.')[0];
}

// Validate IPv4 address (including optional CIDR)
function isIPv4(ip) {
    return /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)(?:\/[0-9]{1,2})?$/.test(ip);
}

// Fetch IP list from source URL
async function fetchIPList() {
    return new Promise((resolve, reject) => {
        https.get(SOURCE_URL, (res) => {
            let data = '';

            if (res.statusCode !== 200) {
                reject(new Error(`Request failed with status ${res.statusCode}`));
                return;
            }

            res.on('data', (chunk) => {
                data += chunk;
            });

            res.on('end', () => {
                try {
                    // Split data into lines and extract IPs
                    const ipList = data
                        .split('\n')
                        .map(line => {
                            // Remove comments (everything after #) and trim
                            const ipPart = line.split('#')[0].trim();
                            return ipPart;
                        })
                        .filter(line => line && isIPv4(line));

                    if (ipList.length === 0) {
                        console.log('Warning: No valid IPv4 addresses found after parsing.');
                    }
                    resolve(ipList);
                } catch (error) {
                    reject(new Error(`Failed to parse IP list: ${error.message}`));
                }
            });
        }).on('error', (error) => {
            reject(new Error(`Request error: ${error.message}`));
        });
    });
}

// Generate RouterOS script
function generateRouterOSScript(ips) {
    const dateTime = getFormattedDateTime();

    // Start building the script
    let script = `# Generated on ${dateTime}\n`;
    script += `/ip firewall address-list remove [find list=${LIST_NAME}]\n`;
    script += ':local ips { \\\n';

    // Format each IP
    ips.forEach((ip, index) => {
        if (isIPv4(ip)) {
            script += `{ "${ip}" }`;
            if (index < ips.length - 1) {
                script += ';';
            }
            script += '\\\n';
        }
    });

    // Close the array and add foreach loop-products
    script += '};\n';
    script += `:foreach ip in=$ips do={\n`;
    script += `\t/ip firewall address-list add list=${LIST_NAME} address=$ip\n`;
    script += '}\n';

    return script;
}

// Main execution
async function main() {
    try {
        console.log('Fetching IPv4 addresses from source...');
        const ipData = await fetchIPList();

        if (!ipData.length) {
            console.log('No valid IPv4 addresses found.');
            return;
        }

        console.log(`Found ${ipData.length} IPv4 addresses. Generating RouterOS script...`);
        const routerOsScript = generateRouterOSScript(ipData);

        // Ensure build directory exists
        if (!fs.existsSync(OUTPUT_DIR)) {
            fs.mkdirSync(OUTPUT_DIR, { recursive: true });
        }

        // Write script to .rsc file
        fs.writeFileSync(OUTPUT_FILE, routerOsScript);
        console.log(`Script saved to ${OUTPUT_FILE}`);

    } catch (error) {
        console.error('Error:', error.message);
        process.exit(1);
    }
}

// Run the script
main();