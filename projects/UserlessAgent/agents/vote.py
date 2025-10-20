from openai import OpenAI
import toml
import os
import json
import re

# ========== 路径设置 ==========
base_dir = os.path.dirname(os.path.abspath(__file__))  # 当前 vote.py 所在目录
proposals_dir = os.path.join(base_dir, "proposals")
characters_dir = os.path.join(base_dir, "characters")
save_dir = os.path.join(base_dir, "response")

os.makedirs(save_dir, exist_ok=True)  # 若 response 文件夹不存在则创建

# ========== 模型和提示信息 ==========
model = "deepseek-chat"
BASE_URL = "https://api.deepseek.com/v1"
DEEPSEEK_API_KEY = ""
sys_prompt = (
    "Now you are gonna be asked to respond to a decentralized governance proposal."
    "Your response should start with a 'For/Against/Abstain' (do not do any formatting), period, then a short comment for this proposal."
    "Your character setting is like below: \n"
)

# ========== JSON 加载 ==========
def load_json(dir):
    json_files = []
    for filename in os.listdir(dir):
        if filename.endswith(".json"):
            file_path = os.path.join(dir, filename)
            with open(file_path, 'r') as file:
                try:
                    json_data = json.load(file)
                    json_files.append(json_data)
                except json.JSONDecodeError:
                    print(f"[ERROR] Failed to decode: {file_path}")
    return json_files

def load_proposal(id):
    filepath = os.path.join(proposals_dir, f"{id}.json")
    with open(filepath, 'r') as file:
        try:
            json_data = json.load(file)
        except json.JSONDecodeError:
            print(f"[ERROR] Failed to decode: {filepath}")
            json_data = {}
    return json_data

# ========== 投票函数 ==========
def vote(proposal, character):
    client = OpenAI(api_key=DEEPSEEK_API_KEY, base_url=BASE_URL)

    content_sys = sys_prompt + json.dumps(character)
    content_usr = json.dumps(proposal)
    
    response = client.chat.completions.create(
        model=model,
        messages=[
            {'role': 'system', 'content': content_sys},
            {'role': 'user', 'content': content_usr},
        ],
        stream=False
    ).choices[0].message.content

    match = re.match(r"(\w+)\.\s*(.*)", response, re.DOTALL)

    json_data = {
        "name": character["name"],
        "vote": match.group(1),
        "comment": match.group(2).strip()
    }

    return json_data

# ========== 主处理函数 ==========
def process_proposal(id):
    proposal = load_proposal(id)
    characters = load_json(characters_dir)

    save_path = os.path.join(save_dir, f"{proposal['proposal_id']}.json")

    with open(save_path, "w") as file:
        json_response = []
        for character in characters:
            print(proposal["proposal_id"], character["name"])
            response = vote(proposal=proposal, character=character)
            print(response["vote"])
            print("-" * 20)
            json_response.append(response)
        json.dump(json_response, file, indent=4)

# ========== 程序入口 ==========
if __name__ == '__main__':
    process_proposal("EVIP-202")

# 在发送请求时使用
headers = {
    "Authorization": f"Bearer {DEEPSEEK_API_KEY}",
    "Content-Type": "application/json"
}