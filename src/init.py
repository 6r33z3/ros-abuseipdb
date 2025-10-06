#!/usr/bin/env python3

import os
import requests
from ipaddress import IPv4Network, collapse_addresses, ip_network
from itertools import chain
from pathlib import Path

addresses = dict[IPv4Network, str]()

TIMEOUT = os.getenv('TIMEOUT', '1')
BASE_DIR = 'data'
BASE_FILENAME = f'abuseipdb-s100-{TIMEOUT}d'
_INPUTFILE = Path(BASE_DIR) / f'{BASE_FILENAME}.ipv4'
_OUTPUTFILE = Path(BASE_DIR) / f'{BASE_FILENAME}-collapsed.ipv4'
_COMMENT_LINES = list[str]()
_DOWNLOAD_URL = f'https://raw.githubusercontent.com/borestad/blocklist-abuseipdb/refs/heads/main/{BASE_FILENAME}.ipv4'

Path(BASE_DIR).mkdir(exist_ok=True)

response = requests.get(_DOWNLOAD_URL)
response.raise_for_status()
with open(_INPUTFILE, 'w', encoding='utf-8') as fd:
    fd.write(response.text)

with open(_INPUTFILE, encoding='utf-8') as fd:
    for line in fd:
        if line.startswith('#'):
            _COMMENT_LINES.append(line)
            continue
        address, comment = line.split(maxsplit=1)
        ip_obj = ip_network(address=address)
        if isinstance(ip_obj, IPv4Network):
            addresses[ip_obj] = comment.rstrip()

collapsed_ipv4 = collapse_addresses(addresses=addresses.keys())

with open(_OUTPUTFILE, 'w', encoding='utf-8') as fd:
    fd.writelines(_COMMENT_LINES)
    for item in collapsed_ipv4:
        item_str = str(item.network_address) if item.prefixlen == 32 else str(item.compressed)
        if comment_original := addresses.get(item):
            comment = ' ' * (17 - len(item_str)) + comment_original
            fd.write(f'{item_str}{comment}\n')
        else:
            comment = ' ' * (17 - len(item_str)) + '# MERGED'
            fd.write(f'{item_str}{comment}\n')
