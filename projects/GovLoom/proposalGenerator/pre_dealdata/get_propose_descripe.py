# import pandas as pd
# from bs4 import BeautifulSoup
# import time
# from tqdm import tqdm
#
# # --- Selenium相关的导入 ---
# from selenium import webdriver
# from selenium.webdriver.chrome.service import Service as ChromeService
# from webdriver_manager.chrome import ChromeDriverManager
# from selenium.webdriver.chrome.options import Options
# # 导入智能等待所需模块
# from selenium.webdriver.common.by import By
# from selenium.webdriver.support.ui import WebDriverWait
# from selenium.webdriver.support import expected_conditions as EC
# from selenium.common.exceptions import TimeoutException, WebDriverException
#
#
# def setup_driver():
#     """配置并返回一个Selenium WebDriver实例"""
#     chrome_options = Options()
#
#     # --- 关键改动：注释掉 headless 模式，让浏览器窗口显示出来以便调试 ---
#     # chrome_options.add_argument("--headless")
#
#     chrome_options.add_argument("--no-sandbox")
#     chrome_options.add_argument("--disable-dev-shm-usage")
#     chrome_options.add_argument("--start-maximized")  # 最大化窗口，模拟真实用户
#     chrome_options.add_argument("--log-level=3")
#     chrome_options.add_argument(
#         "user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36")
#
#     service = ChromeService(ChromeDriverManager().install())
#     driver = webdriver.Chrome(service=service, options=chrome_options)
#     return driver
#
#
# def scrape_proposal_details_with_selenium(input_csv_file, output_csv_file):
#     """
#     使用Selenium，通过智能等待和可视化浏览器，抓取提案详细信息。
#     """
#     try:
#         df = pd.read_csv(input_csv_file)
#         print(f"成功读取文件: {input_csv_file}，准备处理 {len(df)} 个提案。")
#     except FileNotFoundError:
#         print(f"错误: 找不到文件 '{input_csv_file}'。")
#         return
#
#     all_proposal_data = []
#     driver = setup_driver()
#
#     try:
#         for index, row in tqdm(df.iterrows(), total=df.shape[0], desc="正在爬取提案详情"):
#             url = row['proposal_link']
#
#             try:
#                 driver.get(url)
#
#                 # --- 关键改动：使用智能等待代替 time.sleep() ---
#                 # 等待标题(h1)元素出现，最长等待15秒
#                 wait = WebDriverWait(driver, 15)
#                 wait.until(EC.presence_of_element_located((By.TAG_NAME, "h1")))
#
#                 # 等待内容(div.markdown-body)出现，增加鲁棒性
#                 wait.until(EC.presence_of_element_located((By.CSS_SELECTOR, "div.markdown-body")))
#
#                 # 等待完成后，页面已加载完毕，可以安全地获取HTML
#                 html_content = driver.page_source
#                 soup = BeautifulSoup(html_content, 'html.parser')
#
#                 # --- 关键改动：使用您提供的精确选择器 ---
#                 title_tag = soup.find('h1', class_='break-words')
#                 title = title_tag.get_text(strip=True) if title_tag else "标题未找到"
#
#                 created_date, start_date, end_date = "未找到", "未找到", "未找到"
#                 time_container = soup.find('div', class_='flex-auto leading-6')
#                 if time_container:
#                     time_items = time_container.find_all('div', class_='mb-3 last:mb-0 h-[44px]')
#                     for item in time_items:
#                         h4_tag = item.find('h4')
#                         if h4_tag:
#                             time_label = h4_tag.get_text(strip=True)
#                             date_div = item.find('div', class_='flex gap-2 items-center')
#                             date_text = date_div.find('div').get_text(strip=True) if date_div and date_div.find(
#                                 'div') else ""
#                             if time_label == 'Created':
#                                 created_date = date_text
#                             elif time_label == 'Start':
#                                 start_date = date_text
#                             elif time_label == 'End':
#                                 end_date = date_text
#
#                 # --- 关键改动：使用正确的 class 'markdown-body' ---
#                 details_container = soup.find('div', class_='markdown-body')
#                 details = details_container.get_text(separator='\n\n', strip=True) if details_container else "详细内容未找到"
#
#                 proposal_info = {
#                     'original_title': row['title'],
#                     'full_title': title,
#                     'created_date': created_date,
#                     'start_date': start_date,
#                     'end_date': end_date,
#                     'details': details,
#                     'link': url
#                 }
#                 print("proposal info:",proposal_info)
#                 all_proposal_data.append(proposal_info)
#
#             except TimeoutException:
#                 print(f"\n访问 {url} 超时，页面关键元素未在15秒内加载。")
#                 all_proposal_data.append(
#                     {'original_title': row['title'], 'full_title': '加载超时', 'link': url, 'details': '页面加载超时',
#                      'created_date': '', 'start_date': '', 'end_date': ''})
#             except Exception as e:
#                 print(f"\n处理 {url} 时发生未知错误: {e}")
#                 all_proposal_data.append(
#                     {'original_title': row['title'], 'full_title': '处理失败', 'link': url, 'details': f"错误: {e}",
#                      'created_date': '', 'start_date': '', 'end_date': ''})
#
#     finally:
#         driver.quit()
#         print("\n浏览器已关闭。")
#
#     if all_proposal_data:
#         final_df = pd.DataFrame(all_proposal_data)
#         final_df.to_csv(output_csv_file, index=False, encoding='utf-8-sig')
#         print(f"全部处理完成！详细数据已保存到: {output_csv_file}")
#     else:
#         print("\n未能收集到任何数据。")
#
#
#
#
# if __name__ == '__main__':
#     input_file = 'D:\\code\\proposals_with_full_links.csv'
#     output_file = 'proposals_details_final.csv'
#
#     scrape_proposal_details_with_selenium(input_file, output_file)

import pandas as pd
import re


def clean_description_final(text):
    """
    最终版智能清洗函数。
    规则：默认合并所有行，除非某行明显是一个新段落/列表项的开始。
    """
    if not isinstance(text, str):
        return ""

    lines = text.splitlines()
    if not lines:
        return ""

    # 移除完全空白的行，只留下有内容的行
    non_empty_lines = [line.strip() for line in lines if line.strip()]

    if not non_empty_lines:
        return ""

    # 初始化结果，以第一行开始
    result_text = non_empty_lines[0]

    # 遍历从第二行开始的每一行
    for i in range(1, len(non_empty_lines)):
        current_line = non_empty_lines[i]

        # 定义一个“新段落/列表项”的判断条件
        # 1. 以大写字母开头 (像一个新句子)
        # 2. 以数字和点/括号开头 (像一个列表) e.g., "1.", "1)"
        # 3. 以星号/破折号和空格开头 (像一个列表) e.g., "* ", "- "
        is_new_paragraph = (
                current_line[0].isupper() or
                re.match(r'^\d+[\.\)]', current_line) or
                re.match(r'^[\*\-]\s', current_line)
        )

        # 获取上一行的最后一个字符，判断是否是句末
        previous_line_last_char = result_text[-1]
        is_end_of_sentence = previous_line_last_char in ['.', ':', '?', '!']

        # 如果当前行不是一个新段落的开始，或者上一行不是以句末标点结束，
        # 那么我们就更倾向于将它们合并。
        # 简化逻辑：如果当前行看起来不像一个新段落的开头，就合并。

        # 让我们回到您最初的、更简洁的规则，但反向思考：
        # 什么时候我们应该 *换行*？
        # 1. 当上一行明显是标题时 (很短，没有标点结尾)
        # 2. 当当前行以大写字母/数字列表/符号列表开头时
        # 为了简单和鲁棒，我们采用一个混合策略：

        first_char = current_line[0]
        # 如果首字母是小写，或者不是字母和数字（很可能是标点），就合并
        if first_char.islower() or (not first_char.isalnum()):
            result_text += ' ' + current_line
        else:
            # 否则，另起一行。用 \n\n 来表示段落分隔，更清晰
            result_text += '\n\n' + current_line

    return result_text


def process_csv_final(input_csv, output_csv, column_to_clean):
    try:
        df = pd.read_csv(input_csv)
        print(f"成功读取文件: {input_csv}")
    except FileNotFoundError:
        print(f"错误: 找不到文件 '{input_csv}'。")
        return

    if column_to_clean not in df.columns:
        print(f"错误: 在CSV文件中找不到名为 '{column_to_clean}' 的列。")
        return

    print(f"正在对 '{column_to_clean}' 列应用最终版清洗规则...")
    df[column_to_clean] = df[column_to_clean].apply(clean_description_final)
    print("清洗完成！")

    df.to_csv(output_csv, index=False, encoding='utf-8-sig')
    print(f"处理完成！已将最终版数据保存到: {output_csv}")


if __name__ == '__main__':
    input_file = 'D:\code\proposals_details_final.csv'
    output_file = 'proposals_cleaned_final.csv'
    column_name = 'details'
    process_csv_final(input_file, output_file, column_name)