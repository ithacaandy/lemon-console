# Browser access away from home

Lemon Console and Guacamole need to share one HTTPS origin. For example, serve the workspace at https://console.example.com/workspace/ and Guacamole at https://console.example.com/guacamole/. Route both paths through your HTTPS reverse proxy and allow WebSocket upgrades for Guacamole. Keep the upstream web services and desktop protocols on private addresses.

## Check inbound connectivity

Compare the router's WAN IPv4 address with the public IPv4 seen by the host. A mismatch can indicate another router or ISP address translation. Matching addresses still require an outside-network test.

Use a temporary listener serving a fixed, harmless response on a separate internal port. Forward only the external TCP port you intend to use and test from cellular with Wi-Fi off. A plain HTTP listener tests TCP reachability only, even if the external port is 443. Remove the temporary forwarding and firewall rules after testing.

## Configure the public address

1. Create a dedicated subdomain such as console.example.com. For a changing public IPv4, create a separate public dynamic DNS hostname and point the subdomain to it with a CNAME. Verify the dynamic DNS target resolves before replacing an existing A record.
2. Schedule the home host to update the dynamic DNS hostname. Keep the provider token in a protected local secret file. Check the updater's exit status and confirm public DNS returns the current WAN address. Preserve any separate hostname used for private access inside the home.
3. Configure the HTTPS reverse proxy for the bookmark hostname. Choose a certificate validation method your DNS and network support. Caddy can use TLS-ALPN validation over inbound TCP 443 or DNS validation with the appropriate provider integration.
4. Enable Guacamole multi-factor authentication, verify it with a fresh sign-in, and review account and connection permissions. Keep Guacamole and the reverse proxy updated. Publish only the reverse proxy's HTTPS port. Leave RDP, VNC, SSH, guacd, and the database private.
5. From cellular, verify the certificate, sign-in, authenticator prompt, and a full desktop session. After an A-to-CNAME cutover, query the authoritative DNS and a public resolver. A successful page load can still use a cached A record, so look for the actual CNAME in the DNS answer.

If no inbound route is available, a browser-accessible tunnel with an access policy is another option. Check the tunnel provider's hostname, authentication, and WebSocket requirements.

Some routers do not support reaching their public IP from inside the LAN. Use a private bookmark or local DNS for at-home access in that case. The host and portal must be running for outside access.
