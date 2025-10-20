
### 1. **创建虚拟环境**

打开终端或命令提示符，并运行以下命令：

```bash
python3 -m venv .venv
```

### 2. **激活虚拟环境**

* **macOS/Linux**:

  ```bash
  source .venv/bin/activate
  ```

* **Windows**:

  ```bash
  .\.venv\Scripts\activate
  ```

### 3. **验证虚拟环境是否激活**

激活后，你会看到终端提示符发生变化，通常会看到 `(venv)` 前缀，表示虚拟环境已经激活。

### 4. **安装依赖**

在虚拟环境中，你可以使用 `pip` 安装项目所需的依赖：

```bash
pip install -r requirements.txt
```

这样就能开始使用你的虚拟环境了。
