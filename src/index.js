const fs = require('fs');
const path = require('path');

// Configuration
const TIMEOUT = process.env.TIMEOUT || '1';
const LIST_NAME = `abuseipdb-s100-${TIMEOUT}d`;
const OUTPUT_DIR = 'build';
const INPUT_FILE = path.join('data', `${LIST_NAME}-collapsed.ipv4`);
const OUTPUT_FILE = path.join(OUTPUT_DIR, `${LIST_NAME}.rsc`);

// Helper function to format current date and time
function getFormattedDateTime() {
    const now = new Date();
    return now.toISOString().replace('T', ' ').split('.')[0];
}

// Validate IPv4 address (including optional CIDR)
function isIPv4(ip) {
    return /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)(?:\/[0-9]{1,2})?$/.test(ip);
}

// Read IP list from local file
function readIPList() {
    try {
        const data = fs.readFileSync(INPUT_FILE, 'utf-8');
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
            throw new Error('No valid IPv4 addresses found after parsing.');
        }
        return ipList;
    } catch (error) {
        throw new Error(`Failed to read or parse IP list: ${error.message}`);
    }
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

    // Close the array and add foreach loop
    script += '};\n';
    script += `:foreach ip in=$ips do={\n`;
    script += `\t/ip firewall address-list add list=${LIST_NAME} address=$ip dynamic=yes timeout=${TIMEOUT}d\n`;
    script += '}\n';
    script += `:set ips\n`;

    return script;
}

// Main execution
function main() {
    try {
        console.log(`Reading IPv4 addresses from ${INPUT_FILE}...`);
        const ipData = readIPList();

        if (!ipData.length) {
            console.log('No valid IPv4 addresses found.');
            return;
        }

        console.log(`Found ${ipData.length} IPv4 addresses. Generating RouterOS script...`);
        const routerOsScript = generateRouterOSScript(ipData);

        // Ensure build directory exists
        if (!fs.existsSync(OUTPUT_DIR)) {
            fs.mkdirSync(OUTPUT_DIR, {
                recursive: true
            });
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