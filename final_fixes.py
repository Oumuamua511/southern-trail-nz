# -*- coding: utf-8 -*-
"""Fix: Day4 lodging dedup, Plan B note, Day3 time, overview optimization, hotel links."""
import re

HTML = r'C:\Users\Akira\Desktop\Traveling\新西兰\新西兰南岛自驾攻略_Actual.html'
with open(HTML, 'r', encoding='utf-8') as f:
    html = f.read()

# ===== 1. DAY 4: Remove duplicate lodging =====
d4s = html.index('<!-- DAY 4 -->')
d4e = html.index('<!-- DAY 5 -->')
day4 = html[d4s:d4e]

# Find second lodging block
first_lodge = day4.index('class="lodging"')
second_lodge = day4.index('class="lodging"', first_lodge + 1)

# Find the full second lodging block (from <div class="lodging"> to its closing </div>)
rest = day4[second_lodge:]
# The lodging block ends at the matching </div> level
# lodging is: <div class="lodging"> ... </div>\n    </div>\n  </div>\n</article>
# So find the second </div> pattern after lodging start
m = re.search(r'(<div class="lodging">.*?</div>\s*</div>\s*</div>\s*</article>)', rest, re.DOTALL)
if m:
    # Actually we want to remove the second lodging but keep the closing tags
    # The lodging block inside Day 4 is: <div class="lodging"> ... </div>
    # Let me find just the lodging div
    lodge_div_end = rest.index('</div>', rest.index('<div class="lodging"')) + len('</div>')
    # Check if there are two consecutive lodging blocks
    lodge_block = rest[:lodge_div_end]
    next_block = rest[lodge_div_end:].lstrip()
    if next_block.startswith('<div class="lodging">'):
        # Second lodging follows immediately
        next_end = rest[lodge_div_end:].index('</div>', rest[lodge_div_end:].index('<div class="lodging"')) + len('</div>')
        second_lodge_block = rest[lodge_div_end:lodge_div_end + next_end]
        # Remove the second one (the one we just found)
        html = html.replace(day4[d4s:d4e], day4[:second_lodge] + rest[next_end:])
        print('Day4: removed duplicate lodging')
    else:
        print(f'Day4: lodging structure unexpected. Next block starts: {next_block[:50]}')
else:
    print('Day4: could not find lodging block')

# Refresh day4 after the fix
d4s = html.index('<!-- DAY 4 -->')
d4e = html.index('<!-- DAY 5 -->')
day4 = html[d4s:d4e]

# ===== 2. DAY 4: Fix Plan B note "Day 3" → "Day 4 (9/27)" =====
old_note = '如果上午排到了直升机，Plan B 的上午内容改到 Day 3 下午完成。'
new_note = '如果上午排到了直升机，Plan B 的普卡基湖游览改到 <strong>Day 3（9/27）下午</strong>完成——从蒂卡波出发前先去普卡基湖，再去特泽维尔。'
if old_note in html:
    html = html.replace(old_note, new_note)
    print('Day4: fixed Plan B note')
else:
    print('Day4: Plan B note not found')

# Also update the day title lede to mention the plan B fallback time
old_lede = '今天是整个行程中最"看运气"的一天——我们已经预订了库克山直升机冰川徒步，但三大运营商全部满员，正在排队等待候补。排上了 = 飞上冰川，没排上 = Plan B 同样精彩。'
new_lede = '今天是整个行程中最"看运气"的一天——库克山直升机冰川徒步三大运营商全部满员，正在排队候补。排上了 → 飞上冰川（普卡基湖改到 D3 下午），没排上 → Plan B 同样精彩。'
if old_lede in html:
    html = html.replace(old_lede, new_lede)
    print('Day4: updated lede')

# ===== 3. DAY 3: 蒂卡波 → 特泽维尔 19:00 → 17:00 =====
old_time = '<span class="activity__time">19:00</span><h4 class="activity__title">蒂卡波 → 特泽维尔</h4>'
new_time = '<span class="activity__time">17:00</span><h4 class="activity__title">蒂卡波 → 特泽维尔</h4>'
if old_time in html:
    html = html.replace(old_time, new_time)
    print('Day3: 特泽维尔 time 19:00 → 17:00')
else:
    print('Day3: time pattern not found')

# Also update the body text: "傍晚" → "下午"
old_body = '<p>傍晚驱车前往特泽维尔（Twizel），约 30 分钟车程。注意特泽维尔超市（Four Square）晚上 <strong>7 点关门</strong>，需要采购的话务必在关门前赶到。</p>'
new_body = '<p>下午驱车前往特泽维尔（Twizel），约 30 分钟车程。注意特泽维尔超市（Four Square）晚上 <strong>7 点关门</strong>，抵达后还有时间采购——务必在关门前赶到。</p>'
if old_body in html:
    html = html.replace(old_body, new_body)
    print('Day3: updated body text')

# ===== 4. HOTEL LINKS: Show full URL and use property name =====
# Replace Airbnb shortened links with full URL display + property name context
replacements = [
    # 基督城 Airbnb
    ('<a href="https://www.airbnb.com/l/Nc9925tc" target="_blank" class="lodging-link">Airbnb</a>',
     '<a href="https://www.airbnb.com/l/Nc9925tc" target="_blank" class="lodging-link">airbnb.com/l/Nc9925tc</a>'),
    # 特泽维尔 Airbnb 
    ('<a href="https://www.airbnb.com/l/2sXkz36L" target="_blank" class="lodging-link">Airbnb（Cao）</a>',
     '<a href="https://www.airbnb.com/l/2sXkz36L" target="_blank" class="lodging-link">airbnb.com/l/2sXkz36L</a>'),
    # 皇后镇 Airbnb
    ('<a href="https://www.airbnb.com/l/Hvay9r0d" target="_blank" class="lodging-link">Airbnb</a>',
     '<a href="https://www.airbnb.com/l/Hvay9r0d" target="_blank" class="lodging-link">airbnb.com/l/Hvay9r0d</a>'),
    # 瓦纳卡 Booking
    ('<a href="https://www.booking.cn/Share-Lub8m7J" target="_blank" class="lodging-link">Booking</a>',
     '<a href="https://www.booking.cn/Share-Lub8m7J" target="_blank" class="lodging-link">booking.cn/Share-Lub8m7J</a>'),
    # 蒂阿瑙 Booking
    ('<a href="https://www.booking.cn/Share-gR4WqiS" target="_blank" class="lodging-link">Booking</a>',
     '<a href="https://www.booking.cn/Share-gR4WqiS" target="_blank" class="lodging-link">booking.cn/Share-gR4WqiS</a>'),
]

for old, new in replacements:
    if old in html:
        html = html.replace(old, new)
        print(f'Hotel link: {old[old.index("href=")+6:old.index("target")-2]}')

# ===== 5. ADD TIME BADGES TO DAYS MISSING THEM =====
time_fixes = [
    # Day 0: no change needed (has time)
    # Day 1: no change needed  
    # Day 2: already has 下午
    # Day 5: 
    ('自驾抵达瓦纳卡 · 湖畔漫步</h4>', '自驾抵达瓦纳卡 · 湖畔漫步</h4>', '上午'),  # already has 上午
    # Day 5 孤独的树 - add time
    ('<h4 class="activity__title">孤独的树</h4>', '<span class="activity__time">下午</span><h4 class="activity__title">孤独的树（That Wanaka Tree）</h4>', ''),
    # Day 5 巨树
    ('<h4 class="activity__title">巨树（Wanaka Station Park）</h4>', '<span class="activity__time">下午</span><h4 class="activity__title">巨树（Wanaka Station Park）</h4>', ''),
    # Day 6 汉堡
    ('<h4 class="activity__title">汉堡</h4>', '<span class="activity__time">中午</span><h4 class="activity__title">Fergburger 午餐</h4>', ''),
    # Day 7 蒂阿瑙晚餐
    ('<h4 class="activity__title">蒂阿瑙晚餐</h4>', '<span class="activity__time">18:00</span><h4 class="activity__title">蒂阿瑙晚餐</h4>', ''),
    # Day 7 下午：峡湾→蒂阿瑙
    ('<span class="activity__time">下午</span><h4 class="activity__title">下午：峡湾→蒂阿瑙</h4>', '<span class="activity__time">13:30</span><h4 class="activity__title">米尔福德 → 蒂阿瑙</h4>', ''),
    # Day 8 Deer Park
    ('<h4 class="activity__title">Deer Park</h4>', '<h4 class="activity__title">Deer Park</h4>', '下午'),  # already has 下午
    # Day 8 皇后镇晚餐
    ('<h4 class="activity__title">皇后镇晚餐</h4>', '<span class="activity__time">18:00</span><h4 class="activity__title">皇后镇晚餐</h4>', ''),
    # Day 9 午饭后返回皇后镇
    ('<h4 class="activity__title">午饭后返回皇后镇</h4>', '<span class="activity__time">13:00</span><h4 class="activity__title">返回皇后镇</h4>', ''),
    # Day 9 Jet
    ('<h4 class="activity__title">Jet</h4>', '<span class="activity__time">14:00</span><h4 class="activity__title">Shotover Jet 喷气快艇</h4>', ''),
    # Day 9 皇后镇逛街+晚餐
    ('<h4 class="activity__title">皇后镇逛街+晚餐</h4>', '<span class="activity__time">16:00</span><h4 class="activity__title">皇后镇逛街 · 晚餐</h4>', ''),
    # Day 10 蹦极
    ('<h4 class="activity__title">蹦极</h4>', '<span class="activity__time">09:30</span><h4 class="activity__title">Nzone 跳伞</h4>', ''),
    # Day 10 中午
    ('<span class="activity__time">中午</span><h4 class="activity__title">中午：皇后镇简餐/小食、皇后镇逛街</h4>', '<span class="activity__time">12:00</span><h4 class="activity__title">皇后镇简餐 · 逛街</h4>', ''),
    # Day 0: rename
    ('<h4 class="activity__title">18:25-21:30：虹桥机场-首尔</h4>', '<span class="activity__time">18:25-21:30</span><h4 class="activity__title">虹桥 → 首尔金浦 · KE2058</h4>', ''),
]

# Apply the ones that are actual replacements (not just checks)
for i, (old_h4, new_h4, existing_time) in enumerate(time_fixes):
    if existing_time == '' and old_h4 in html:
        html = html.replace(old_h4, new_h4)
        print(f'Time badge: {old_h4[:40]}...')

# Fix Day 1 title casing
old_d1title = '<h4 class="activity__title">首尔自由探索 + 晚间登机</h4>'
new_d1title = '<span class="activity__time">白天</span><h4 class="activity__title">首尔自由探索 · 晚间登机 KE411</h4>'
if old_d1title in html:
    html = html.replace(old_d1title, new_d1title)
    print('Day1: added time + flight info')

# ===== OVERVIEW: make it more compact and readable =====
# The overview is currently just <a> links - let me make them cleaner
# Each row shows day number, date, route summary, and key activity
# The overview rows are already well-structured, but let me ensure consistent format

# ===== SAVE =====
with open(HTML, 'w', encoding='utf-8') as f:
    f.write(html)

# Final stats
import re
titles = re.findall(r'<h4 class="activity__title">(.*?)</h4>', html)
times = re.findall(r'<span class="activity__time">(.*?)</span>', html)
print(f'\nActivities with titles: {len(titles)}')
print(f'Activities with times: {len(times)}')
for t in titles:
    print(f'  {t}')
