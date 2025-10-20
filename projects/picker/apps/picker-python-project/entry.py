import os
import toml
from src.main import main
from time import sleep

def entry():
    # 获取 config.toml 在主机上的绝对路径，兼容Windows和Unix系统
    config_path = os.path.join(os.path.dirname(__file__), "config.toml")

    # 读取 config.toml
    config = toml.load(config_path)

    try:
        config["task"]["status"] = "Running"
        with open(config_path, "w") as f:
            toml.dump(config, f)
        main()
        sleep(1)
    except FileNotFoundError:
        print("Error: config.toml not found.")
        return
    except toml.TomlDecodeError as e:
        print(f"Error: config.toml is malformed: {e}")
        return
    except Exception:
        config["task"]["status"] = "Error"
        with open(config_path, "w") as f:
            toml.dump(config, f)
        raise

    config["task"]["status"] = "Idle"
    with open(config_path, "w") as f:
        toml.dump(config, f)

if __name__ == "__main__":

    entry()
