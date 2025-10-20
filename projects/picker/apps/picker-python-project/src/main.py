import logging
from time import sleep
import os
from pathlib import Path
import toml

logging.basicConfig(level=logging.INFO)

def your_first_function():
    logging.info("Picker is AI powered Smart System that supports Web3.")
    sleep(1)
    logging.warning("This is a test warning message from python project.")
    sleep(1)
    logging.error("This is a test error message from python project.")
    sleep(1)

    # Get the absolute path of main.py
    main_py_path = Path(__file__).absolute()
    # Get the project root directory (go up two levels from src/main.py)
    project_root = main_py_path.parent.parent
    # Construct config.toml path
    config_path = project_root / 'config.toml'
    
    logging.info(f"Reading configuration from: {config_path}")
    
    # Read and parse config.toml file
    with open(config_path, 'r', encoding='utf-8') as f:
        config = toml.load(f)
    
    # Get environment namespace
    env = config.get('environment', {})
    
    # Print all parameters in environment namespace
    logging.info('Environment parameters:')
    for key, value in env.items():
        if isinstance(value, dict):
            logging.info(f"{key}:")
            for sub_key, sub_value in value.items():
                logging.info(f"{sub_key}: {sub_value}")
        else:
            logging.info(f"{key}: {value}")

# main.py
def main():
    your_first_function()

if __name__ == '__main__':

    main()
