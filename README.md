# Switch Port proxy and Firewall (swpf)

This is a command line tool to easily enable/disable port proxies and firewalls.

> [!NOTE]
> Support for Winsows only.

## Install

```shellsession
deno task install 
```

## Usage

### Initialize Config

Create config file your home dir. `${HOME}/.swpf.toml`

```toml
[my-app-server]
listenAddr = "192.168.0.1"
connectAddr = "127.0.0.1"
bindPorts = [8080]
fwRuleName = "my-app-server"
```

### Execute

```shellsession
# Show port proxy and firewall status for choice configured service
swpf status my-app-server

# Enable port proxy and firewall for choice configured service
swpf enable my-app-server

# Disable port proxy and firewall for choice configured service
swpf disable my-app-server
```
