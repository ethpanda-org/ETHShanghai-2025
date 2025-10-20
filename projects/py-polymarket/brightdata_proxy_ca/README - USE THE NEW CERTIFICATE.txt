Please use the *new* SSL certificate for all new projects and avoid using the previous certificate. the new certificate is effective from September 2024

IMPORTANT: to use the *new* certificate, you must use port 33335 when connecting to Bright Data's proxy network, even if documentation and sample codes provided mention port 22225. Documentation will gradually be updated to port 33335 as the old certificate is being phased out.

The actual certificate binaries have been removed from this repository to avoid leaking vendor secrets. Retrieve the current Bright Data CA bundle through their official portal and store it securely (for example in a secret manager or encrypted storage volume). At deploy time mount the certificate path into the container or point `BRIGHTDATA_PROXY_CA_PATH` to the decrypted file.

Operational reminders:

- When you supply the **new** certificate you **must** connect on port `33335` (`brd.superproxy.io:33335`).
- Existing automation should load the certificate from the injected path—do not commit the blob into version control.
- Full instructions for obtaining and installing the certificate remain on https://docs.brightdata.com/general/account/ssl-certificate.

The legacy certificate (port `22225`) is deprecated and must not be reintroduced into this repository. Manage all historical artifacts in a private secret storage instead of source control.
