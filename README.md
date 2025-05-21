# ros-abuseipdb

Converts the upstream blacklist [abuseipdb-s100-1d](https://github.com/borestad/blocklist-abuseipdb/blob/main/abuseipdb-s100-1d.ipv4) from [borestad/blocklist-abuseipdb](https://github.com/borestad/blocklist-abuseipdb) as dynamic address lists for blocking in RouterOS with daily updates.

Tested on RB5009UPr+S+ (7.18.2). Each update cycle cost about 1m 15s.

## script

```routeros
/tool fetch url="https://raw.githubusercontent.com/6r33z3/ros-abuseipdb/refs/heads/main/build/abuseipdb-s100-1d.rsc" dst-path=abuseipdb-s100-1d.rsc mode=https
/import file-name=abuseipdb-s100-1d.rsc
```

Note: Fetch onto `usb1-disk` (if applicable) could help minimizing NAND wearing , e.g.:

```routeros
/tool fetch url="https://raw.githubusercontent.com/6r33z3/ros-abuseipdb/refs/heads/main/build/abuseipdb-s100-1d.rsc" dst-path=usb1-disk/abuseipdb/abuseipdb-s100-1d.rsc mode=https
/import file-name=usb1-disk/abuseipdb/abuseipdb-s100-1d.rsc
```

## scheduler

```routeros
/system scheduler
add comment="cron: update abuseipdb-s100-1d everyday" interval=1d name=abuseipdb-s100-1d on-event=":execute abuseipdb-s100-1d" policy=read,write,policy,test start-date=2025-05-21 start-time=06:00:00
```

## firewall

```routeros
/ip firewall raw
add action=drop chain=prerouting comment="abuseipdb: drop all blacklisted" in-interface-list=WAN log=yes log-prefix="blocked (abuseipdb)" src-address-list=abuseipdb-s100-1d
```
