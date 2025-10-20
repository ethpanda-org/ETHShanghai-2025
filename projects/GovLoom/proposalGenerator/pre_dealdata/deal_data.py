import pandas as pd
from bs4 import BeautifulSoup
import re  # 导入正则表达式模块


def parse_proposals_from_file(input_txt_file, output_csv_file, link_prefix=""):
    """
    从文本文件中读取HTML内容，提取提案标题、链接、票数和法定人数，
    并保存到CSV文件中。
    """
    try:
        with open(input_txt_file, 'r', encoding='utf-8') as f:
            html_content = f.read()
        print(f"成功读取文件: {input_txt_file}")
    except FileNotFoundError:
        print(f"错误：找不到文件 '{input_txt_file}'。")
        return

    soup = BeautifulSoup(html_content, 'html.parser')
    proposal_items = soup.find_all('div', attrs={'data-testid': 'proposal-list-item'})

    if not proposal_items:
        print("未在文件中找到任何提案项。")
        return

    print(f"找到了 {len(proposal_items)} 个提案项，开始提取数据...")

    extracted_data = []
    for item in proposal_items:
        # --- 提取标题和链接（原有逻辑不变） ---
        title_tag = item.find('h3')
        title = title_tag.get_text(strip=True) if title_tag else "标题未找到"

        link_tag = item.find('a', href=True)
        link = link_tag['href'] if link_tag else "链接未找到"

        # --- 新增逻辑：提取 Votes 和 Quorum ---
        votes = "未找到"
        quorum = "未找到"

        # 1. 定位包含 votes 和 quorum 的父级 <span> 标签
        #    这个span通常跟在一个带有'inline'类的div后面
        info_container_div = item.find('div', class_='inline')
        if info_container_div:
            # 使用 find_next_sibling 找到紧随其后的 <span>
            info_span = info_container_div.find_next_sibling('span')

            if info_span:
                # 2. 在父级span中查找包含 'votes' 或中文 '票' 的 <a> 标签
                vote_tag = info_span.find('a', string=re.compile(r'votes|票', re.IGNORECASE))
                if vote_tag:
                    vote_text = vote_tag.get_text(strip=True)
                    # 3. 使用正则表达式提取数字
                    vote_match = re.search(r'(\d+)', vote_text)
                    if vote_match:
                        votes = vote_match.group(1)  # 获取第一个匹配组（即数字）

                # 4. 在父级span中查找包含 'Quorum' 或中文 '法定人数' 的 <span> 标签
                quorum_tag = info_span.find('span', string=re.compile(r'Quorum|法定人数', re.IGNORECASE))
                if quorum_tag:
                    quorum_text = quorum_tag.get_text(strip=True)
                    # 5. 使用正则表达式提取百分比
                    quorum_match = re.search(r'([\d\.]+\s*%)', quorum_text)
                    if quorum_match:
                        quorum = quorum_match.group(1).strip()  # 获取百分比并去除多余空格

        # --- 将所有数据添加到列表中 ---
        extracted_data.append({
            'title': title,
            'votes': votes,
            'quorum': quorum,
            'proposal_link': link
        })

    if extracted_data:
        df = pd.DataFrame(extracted_data)

        if link_prefix:
            df['proposal_link'] = link_prefix + df['proposal_link']
            print(f"已为链接添加前缀: {link_prefix}")

        df.to_csv(output_csv_file, index=False, encoding='utf-8-sig')
        print(f"数据提取完成！结果已保存到: {output_csv_file}")
    else:
        print("提取数据列表为空，未生成CSV文件。")


if __name__ == '__main__':
    # ----- 配置区 -----
    # 请确保这里的路径是正确的
    input_file = 'D:\\code\\test.txt'
    output_file = 'proposals_with_full_links.csv'
    url_prefix_to_add = 'https://snapshot.box/'
    # ------------------

    parse_proposals_from_file(input_file, output_file, link_prefix=url_prefix_to_add)