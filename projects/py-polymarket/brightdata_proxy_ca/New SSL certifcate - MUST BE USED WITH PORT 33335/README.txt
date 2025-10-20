This directory is intentionally empty. Place the decrypted Bright Data certificate file here during deployment or mount it into the container runtime. 

Do not commit the actual certificate into source control—store it in a secure secret manager instead and load it at runtime via `BRIGHTDATA_PROXY_CA_PATH`.
