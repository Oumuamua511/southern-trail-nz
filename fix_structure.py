# -*- coding: utf-8 -*-
"""Fix: structure issues (missing tags, Day0 dup, Day2 flight info, Day4 plan note)."""
HTML = r'C:\Users\Akira\Desktop\Traveling\新西兰\新西兰南岛自驾攻略_Actual.html'
with open(HTML,'r',encoding='utf-8') as f: html=f.read()

# ===== 1. Fix broken route section tag =====
html = html.replace('\nclass="route-section" id="route">', '\n<section class="route-section" id="route">')
print('Fixed: route section opening tag')

# ===== 2. Fix Day 5 missing article close =====
# Day 5 ends with lodging +  then Day 6 should start
# Find Day 5's lodging end and insert </article> before Day 6
day5_marker = '<!-- DAY 5 -->'
day6_marker = '<!-- DAY 6 -->'

# Get Day 5 content
d5s = html.index(day5_marker)
d6s = html.index(day6_marker)
day5end = html.rfind('</div>', d5s, d6s)  # last </div> before Day 6
# Actually, let me check: Day 5 should end with something like:
# </div></div></div></article>
# Let me find the pattern before Day 6

# Show what's right before DAY 6
before_day6 = html[d6s-30:d6s]
print(f'Before Day 6: {repr(before_day6)}')

# Insert article close if missing
if not '</article>' in before_day6:
    # Find the last </div> before Day 6
    last_div = html.rfind('</div>', d5s, d6s)
    html = html[:last_div] + '</div>\n  </div>\n</article>\n\n' + html[last_div:]
    print('Fixed: added missing </article> after Day 5')

# ===== 3. Day 0: Remove duplicate flight time =====
# Current pattern: time badge + activity title both have the time
old_d0 = '<span class="activity__time">18:25-21:30</span><h4 class="activity__title">虹桥 → 首尔金浦 · KE2058</h4>'
new_d0 = '<span class="activity__time">18:25 — 21:30</span><h4 class="activity__title">虹桥 → 首尔金浦 · KE2058</h4>'
html = html.replace(old_d0, new_d0)
print('Day0: cleaned flight time display')

# ===== 4. Day 2: Add flight info for Auckland→Christchurch =====
old_d2 = '''<dl class="day__meta"><dt>ARRIVE</dt><dd>奥克兰 → 基督城</dd><dt>INFO</dt><dd>13:15→14:35</dd></dl>
    </aside>
    <div class="day__body" data-reveal>
      <h3 class="day__title">抵达·<em>基督城取车</em></h3>
      <p class="day__lede">清晨落地奥克兰，转机南下基督城。在"花园之城"取车、休整，为南岛自驾做最后的准备。</p>'''

new_d2 = '''<dl class="day__meta"><dt>FLIGHT</dt><dd>奥克兰 → 基督城 · NZ543</dd><dt>INFO</dt><dd>13:15 → 14:35 · 1h20m</dd></dl>
    </aside>
    <div class="day__body" data-reveal>
      <h3 class="day__title">抵达·<em>基督城取车</em></h3>
      <p class="day__lede">清晨 8:35 落地奥克兰国际机场（AKL），转乘国内航班 NZ543 南下基督城。抵达后取车、休整，在"花园之城"为南岛自驾做最后的准备。</p>'''

if old_d2 in html:
    html = html.replace(old_d2, new_d2)
    print('Day2: added NZ543 flight info')
else:
    print('Day2: pattern not found')

# ===== 5. Day 4: Move signal warning below both plans, remove operator line, add Twizel dinner =====
# First: move the signal warning callout from inside Plan B to below both plans
old_signal = '<div class="callout--tip" style="margin-top:16px;"><strong>无论哪个计划：</strong>冰川区域手机信号极弱，提前下载离线地图。穿防水登山靴，冰川湖中冰山不稳定，切勿靠近湖边。</div>'
new_signal = '<div class="callout--tip" style="margin:16px 0 0 0;"><strong>无论哪个计划：</strong>冰川区域手机信号极弱，提前下载离线地图。穿防水登山靴，冰川湖中冰山不稳定，切勿靠近湖边。</div>'

# Remove operator check line
old_op = '\n      <p style="text-align:center;font-size:0.85em;color:var(--ink-soft);margin-top:8px;">⚡ 出发前致电三大运营商确认候补状态 → 按实际情况执行 A 或 B → 傍晚回到特泽维尔</p>'

# Move signal warning after both plans (after the closing </div> of the plans container)
# The plans container ends with: </div>\n      </div>\n      \n      <p style... CHECK LINE\n    </div>
# Replace: remove signal from inside Plan B, remove operator line, add signal after plans + dinner suggestion

# Find the plan container closing
plan_end_marker = '</div>\n      </div>\n      \n      <p style="text-align:center'
old_plans_end = plan_end_marker + '<p style="text-align:center;font-size:0.85em;color:var(--ink-soft);margin-top:8px;">⚡ 出发前致电三大运营商确认候补状态 → 按实际情况执行 A 或 B → 傍晚回到特泽维尔</p>\n    </div>\n  </div>\n</article>'

new_plans_end = '''</div>
      </div>
      <div class="callout--tip" style="margin:20px 0 0 0;"><strong>无论哪个计划：</strong>冰川区域手机信号极弱，提前下载离线地图。穿防水登山靴，冰川湖中冰山不稳定，切勿靠近湖边。</div>
<div class="activity">
        <div class="activity__head"><span class="activity__time">傍晚</span><h4 class="activity__title">返回特泽维尔 · 晚餐</h4></div>
        <div class="activity__body">
          <p>结束一天的冰川探索，返回特泽维尔。晚餐推荐：<strong>Poppies Cafe</strong>（本地人最爱，三文鱼和羊腿都很棒）、<strong>Ministry of Works Bar & Eatery</strong>（精酿啤酒+汉堡，氛围轻松）、<strong>The Musterer\'s Hut</strong>（简餐+咖啡，白天也适合）。</p>
        </div>
      </div>
    </div>
  </div>
</article>'''

# First, remove the signal from inside Plan B
html = html.replace(old_signal, '')
# Then replace the end section
if old_plans_end in html:
    html = html.replace(old_plans_end, new_plans_end)
    print('Day4: moved signal warning + added Twizel dinner')
else:
    print('Day4: end pattern not found, trying broader match')
    # Try finding the operator line directly
    if old_op in html:
        html = html.replace(old_op, '')
        print('Day4: removed operator line (partial fix)')

with open(HTML,'w',encoding='utf-8') as f: f.write(html)

# Final verification
import re
opens = len(re.findall(r'<article ', html))
closes = len(re.findall(r'</article>', html))
print(f'\nArticle tags: {opens} open, {closes} close')
d_opens = len(re.findall(r'<div ', html))
d_closes = len(re.findall(r'</div>', html))
print(f'Div tags: {d_opens} open, {d_closes} close')
