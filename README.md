# Lemon Console

A browser workspace for an existing Apache Guacamole 1.6 installation. Switch desktops, choose a layout, or expand the focused desktop. Click its label to exit workspace full screen.

1. Copy config.example.js to config.js. Set the data source and one or more distinct connection IDs from your Guacamole installation. Keep IDs and the data source as ASCII strings. The first connection is the default. In Guacamole, open Settings → Connections, then open a connection for editing. For an edit URL ending in /manage/postgresql/c/12, set dataSource to postgresql and id to 12 (as a string).
2. Serve this folder at /workspace/ on the same HTTPS origin as /guacamole/. Guacamole must be accessible in a same-origin iframe.
3. Open /workspace/ and sign in through a desktop pane. Use Guacamole permissions to govern who can open each connection.

Each physical monitor needs a distinct Guacamole connection configured on the server. Side by side needs two connections. All three and Focus + previews need three. If a desktop remains at Sign in / loading, use Open selected desktop in Guacamole to check whether the connection works directly. Scaling and status use Guacamole 1.6 frontend internals and should be rechecked after an upgrade.

The initial release includes the static workspace. The Mac clipboard bridge is deferred pending separate packaging and review. Keep secrets and live backups outside this folder.

Release draft. Browser testing against a separate Guacamole installation is pending.

## License and attribution

Lemon Console is licensed under the [Apache License 2.0](LICENSE). It is an independent companion to [Apache Guacamole](https://guacamole.apache.org/) and is not affiliated with or endorsed by the Apache Software Foundation.

See the [remote access guide](REMOTE-ACCESS.md) for HTTPS, dynamic DNS, and testing from outside your network.
