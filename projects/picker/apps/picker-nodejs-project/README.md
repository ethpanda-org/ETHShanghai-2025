# picker-nodejs-project

Picker startup template for Node.js project.

```text
picker-nodejs-project/
├── src/                    # Source code directory
│   └── main.js             # Main business logic implementation
├── config.toml             # Project configuration file
├── entry.js                # Program entry file
├── package.json            # Node.js project configuration
├── package-lock.json       # Dependency version lock file
├── README.md               # Project documentation
└── .gitignore              # Git ignore rules
```

## Usage

To use this template, you can clone it to your local machine and start working on it.

```bash
git clone <repository-url>
cd picker-nodejs-project
```

You can then install the required dependencies and start developing your project in src/ directory.

```bash
npm install
```

Running your program

```bash
node entry.js
```

Or using npm scripts

```bash
npm start
```

## How to write your program code?

- You should implement any functions or packages in `src/` directory.
- You can add test cases as needed.
- You should write your main program code in `src/main.js` file like this:

```javascript
// Main function
async function yourFirstFunction() {
  console.log('INFO: Picker is AI powered Smart System that supports Web3.');
  await new Promise(resolve => setTimeout(resolve, 1000));
  console.log('WARNING: This is a test warning message.');
  await new Promise(resolve => setTimeout(resolve, 1000));
  console.log('ERROR: This is a test error message.');
}

async function main() {
  try {
    await yourFirstFunction();
  } catch (error) {
    console.error('Error in main function:', error);
    throw error;
  }
}

// Export main function for entry.js
module.exports = { main };
```

## Configuration for picker

The project configuration is stored in `config.toml` file. You can modify it to suit your needs.

```toml
# Your custom environment configuration goes here.
[environment]
max_requests = 35
receive_email_list = ["openpicklabs@hotmail.com"]

[environment.emailSettings]                                  # optional
smtpServer = "smtp.qq.com"
smtpPort = 587
enableSsl = true
senderEmail = ""
senderPassword = ""
subject = "Picker Node.js Project Task Manager Daily Report"

[project]                                                    # optional
name = "picker-nodejs-project"
version = "0.1.0"
description = "Picker startup template for nodejs project."
author = "openpick"
email = "openpicklabs@hotmail.com"
license = "MIT"

[task]                                                      # optional
id = "b7e3a5d1-2c4f-41a7-b9d5-6a3c2b8d1e4f"
name = "Picker Node.js task"
status = "idle"
installed = "240128"
runs = 128
last_run = "240301"
```

