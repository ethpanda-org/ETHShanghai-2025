# picker-python-project

Picker startup template for python project.

```text
picker-python-project/
├── src/                    # Source directory
│   ├── __init__.py         # Package initialization file
│   ├── main.py             # Your main program entry
├── config.toml             # Project configuration file
├── tests/                  # Test code
├── docs/                   # Project documentation
├── data/                   # Data files
├── entry.py                # Program entry
├── pyproject.toml          # Python configuration
├── README.md               # project description
└── .gitignore              # Git ignore rules
```

## Usage

To use this template, you can clone it to your local machine and start working on it.

```bash
git clone <repository-url>
cd picker-python-project
```

You can then install the required dependencies and start developing your project in src/ directory.

```bash
pip install .
```

Running your program

```bash
python src/main.py
```

How to write your program code?

- You should implment any functions or packages in `src/` directory.
- You can add test cases in `tests/` directory.
- You can add documentation in `docs/` directory.
- You can add data files in `data/` directory.

You should write your main program code in `src/main.py` file like this:

```python
import logging

logging.basicConfig(level=logging.INFO)

def main():
    logging.info("Hello, Picker!")

if __name__ == "__main__":
    main()
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
subject = "Picker Python Project Task Manager Daily Report"

[project]                                                    # optional
name = "picker-python-project"                               
version = "0.1.0"                                            
description = "Picker startup template for python project."  
author = "openpick"                                          
email = "openpicklabs@hotmail.com"                           
license = "MIT"                                              

[tasks]                                                      # optional
id = "b7e3a5d1-2c4f-41a7-b9d5-6a3c2b8d1e4f"
name = "Picker Python task"
status = "idle"
installed = "240128"
runs = 128
last_run = "240301"

```
