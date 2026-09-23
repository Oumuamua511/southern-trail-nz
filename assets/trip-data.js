(function (global) {
  'use strict';

  const places = {
    sha_t1: { name: '上海虹桥 T1', address: null, query: 'Shanghai Hongqiao International Airport Terminal 1', precision: 'place-search', source: 'https://www.shanghaiairport.com/enhq/ContactDetails/index.html', note: '机场集团地址不是T1进站门牌，使用航站楼名称定位。' },
    gimpo: { name: '首尔金浦机场 GMP', address: null, query: 'Gimpo International Airport', precision: 'place-search', source: 'https://aim.koca.go.kr/eaipPub/Package/2026-07-23/html/eAIP/KR-AD-2.RKSS-en-GB.html?ver=20250728', note: '机场运营方与旅游页面给出的街道地址不同，使用机场名称定位。' },
    gyeongbokgung: { name: '景福宫', address: '161 Sajik-ro, Jongno-gu, Seoul 03045, Republic of Korea', query: 'Gyeongbokgung Palace 161 Sajik-ro Seoul', precision: 'address', optional: true, source: 'https://english.visitseoul.net/PalaceArea/Gyeongbokgung/ENP000072', note: '首尔官方旅游指南给出此地址；是转机空档的候补去处，请按实际入境时间决定。' },
    myeongdong: { name: '明洞商圈', address: '27 Myeong-dong 8-gil, Jung-gu, Seoul 04536, Republic of Korea', query: 'Myeongdong Shopping Street 27 Myeong-dong 8-gil Seoul', precision: 'address', optional: true, source: 'https://english.visitseoul.net/shopping/Myeongdong/ENP000067', note: '首尔官方旅游指南给出街区参考地址；商圈范围很大，是转机空档的候补去处。' },
    hongdae: { name: '弘大 R2 街区', address: '347-20 Seogyo-dong, Mapo-gu, Seoul 04053, Republic of Korea', query: 'Hongdae R2 Busking Street 347-20 Seogyo-dong Seoul', precision: 'address', optional: true, source: 'https://english.visitseoul.net/attractions/HONGDAE-R2/ENPjggl5r', note: '首尔官方旅游指南给出 R2 街区参考地址；作为弘大候补落点，按转机空档决定。' },
    icn_t2: { name: '仁川国际机场 T2', address: '446 Je2terminal-daero, Yeongjong-gu, Incheon 23358, Republic of Korea', query: 'Incheon International Airport Terminal 2', precision: 'address', source: 'https://www.airport.kr/co_en/4189/subview.do' },
    akl_intl: { name: '奥克兰机场国际航站楼', address: 'Ray Emery Drive, Auckland Airport, New Zealand', query: 'Auckland Airport International Terminal', precision: 'entrance', source: 'https://www.aucklandairport.co.nz/contact-us', note: '官方资料确认道路；未确认门牌。' },
    akl_domestic: { name: '奥克兰机场国内航站楼', address: 'Laurence Stevens Drive, Auckland Airport, New Zealand', query: 'Auckland Airport Domestic Terminal', precision: 'entrance', source: 'https://property.aucklandairport.co.nz/content/dam/aia/files/airport-map-pdfs/dtb-forecourt/Domestic-Terminal-Forecourt.pdf', note: '官方航站楼地图显示道路入口；未确认门牌。' },
    chc_airport: { name: '基督城国际机场', address: 'Durey Road, Christchurch Airport, New Zealand', query: 'Christchurch Airport Terminal', precision: 'entrance', source: 'https://www.christchurchairport.co.nz/contact-us', note: '30 Durey Road为机场联络处所在建筑，并非已核实的航站楼车道门牌。' },
    riverside_market: { name: 'Riverside Market', address: '96 Oxford Terrace, Christchurch Central City, Christchurch 8011, New Zealand', query: 'Riverside Market 96 Oxford Terrace Christchurch', precision: 'address', optional: true, source: 'https://riversidemarket.co.nz/contact/', note: '市集是落地取车后的候补休整点，按抵达和取车进度决定。' },
    christchurch_botanic_gardens: { name: 'Christchurch Botanic Gardens', address: 'Rolleston Avenue, Christchurch Central City, Christchurch 8013, New Zealand', query: 'Christchurch Botanic Gardens Rolleston Avenue', precision: 'entrance', optional: true, source: 'https://www.ccc.govt.nz/parks-and-gardens/christchurch-botanic-gardens/visit/getting-to-the-botanic-gardens', note: '市议会确认 Rolleston Avenue 入口及停车信息；散步为落地后的候补安排。' },
    new_world_durham_street: { name: 'New World Durham Street', address: '175 Durham Street South, Christchurch Central City, Christchurch 8011, New Zealand', query: 'New World Durham Street 175 Durham Street South Christchurch', precision: 'address', optional: true, source: 'https://www.newworld.co.nz/south-island/canterbury/durham-street', note: '超市候补点；地址和营业时间应以 New World 官方门店页为准，抵达当天再核对。' },
    twizel: { name: '特泽维尔', address: 'Twizel, New Zealand', query: 'Twizel New Zealand', precision: 'place-search' },
    mt_john: { name: 'Mt John / Astro Café', address: 'Mount John, Lake Tekapo, New Zealand', query: 'Astro Cafe Mount John Lake Tekapo', precision: 'place-search', source: 'https://www.mackenzienz.com/visit/astro-cafe/', note: '官方地址仅到Mount John；从SH8转山路。' },
    tekapo_church: { name: '好牧羊人教堂', address: 'Pioneer Drive, Lake Takapō, New Zealand', query: 'Church of the Good Shepherd Lake Tekapo', precision: 'entrance', source: 'https://www.churchofthegoodshepherd.org.nz/visit' },
    tekapo_lake: { name: '蒂卡波湖畔', address: 'Lake Tekapo, New Zealand', query: 'Lake Tekapo lakefront', precision: 'place-search', note: '未指定唯一停车点。' },
    pukaki_lookout: { name: "Peter's Lookout", address: 'Lake Pukaki, Canterbury, New Zealand', query: "Peter's Lookout Lake Pukaki", precision: 'place-search', source: 'https://www.mackenzie.govt.nz/__data/assets/pdf_file/0018/516510/Minute-2_PC19_4-December-2018.pdf', note: '官方资料确认湖西岸观景点；无街道地址。' },
    mt_cook_salmon: { name: 'Mt Cook Alpine Salmon / Pukaki Visitor Centre', address: 'Lake Pukaki Visitor Centre, State Highway 8, New Zealand', query: 'Mt Cook Alpine Salmon Lake Pukaki Visitor Centre', precision: 'place-search', source: 'https://alpinesalmon.co.nz/visit-us/', note: '官方称位于Tekapo与Twizel之间、Twizel以北约10公里。' },
    tasman_glacier: { name: 'Tasman Glacier View / Blue Lakes car park', address: 'Tasman Valley Road, Aoraki/Mount Cook National Park, New Zealand', query: 'Tasman Glacier View Track car park', precision: 'entrance', source: 'https://www.doc.govt.nz/parks-and-recreation/places-to-go/canterbury/places/aoraki-mount-cook-national-park/things-to-do/tracks/tasman-lake-and-river-track/' },
    wanaka: { name: '瓦纳卡镇中心', address: 'Wanaka, New Zealand', query: 'Wanaka New Zealand', precision: 'place-search' },
    wanaka_tree: { name: 'That Wānaka Tree', address: 'Lake Wānaka shoreline off Mount Aspiring Road, Wānaka, New Zealand', query: 'That Wanaka Tree', precision: 'place-search', source: 'https://www.wanaka.co.nz/wanaka-stories/your-guide-to-the-wanaka-tree/', note: '官方建议从Pembroke Park或Wanaka Marina步行进入。' },
    wanaka_station: { name: 'Wānaka Station Park / Roys Beach', address: 'Ardmore Street, Wānaka, New Zealand', query: 'Wanaka Station Park', precision: 'entrance', source: 'https://www.wanaka.co.nz/explore/waterfall-creek-track/' },
    te_anau: { name: '蒂阿瑙镇中心', address: 'Te Anau, New Zealand', query: 'Te Anau New Zealand', precision: 'place-search' },
    te_anau_freshchoice: { name: 'FreshChoice Te Anau', address: null, query: 'FreshChoice Te Anau', precision: 'place-search', note: '具体门牌尚未由官方来源核实。' },
    eglinton_valley: { name: 'Eglinton Valley', address: null, query: 'Eglinton Valley Milford Road New Zealand', precision: 'place-search', source: 'https://www.doc.govt.nz/globalassets/documents/parks-and-recreation/tracks-and-walks/fiordland/te-anau-milford-highway-brochure.pdf', note: '这是 SH94 沿线山谷，不是单一门牌；仅在安全的指定停车处停靠。' },
    mirror_lakes: { name: 'Mirror Lakes', address: 'Milford Road, Fiordland, New Zealand', query: 'Mirror Lakes Milford Road New Zealand', precision: 'place-search', source: 'https://www.doc.govt.nz/parks-and-recreation/places-to-go/fiordland/places/fiordland-national-park/things-to-do/tracks/mirror-lakes-walk/', note: 'DOC称距Te Anau约56公里；无街道地址。' },
    pops_view: { name: "Pop's View Lookout", address: null, query: "Pop's View Lookout Milford Road New Zealand", precision: 'place-search', note: '沿米尔福德公路的路侧观景点；Google 地图落点与安全停车位置需现场核对。' },
    monkey_creek: { name: 'Monkey Creek', address: null, query: 'Monkey Creek Milford Road New Zealand', precision: 'place-search', source: 'https://www.doc.govt.nz/globalassets/documents/our-work/milford-opportunities-project/stage-2/mop-tourism-report-2021.pdf', note: 'DOC 将其列为米尔福德公路短暂停靠点，无街道门牌。' },
    homer_tunnel: { name: 'Homer Tunnel', address: 'State Highway 94, Milford Road, New Zealand', query: 'Homer Tunnel Milford Road New Zealand', precision: 'place-search', source: 'https://www.doc.govt.nz/parks-and-recreation/places-to-go/fiordland/places/fiordland-national-park/places-to-go/milford-road-milford-sound-area/milford-road-tips-for-drivers/', note: '高山道路设施；不应把洞口当作普通停车点。' },
    milford_terminal: { name: 'Milford Sound Visitor Terminal', address: 'Milford Sound Visitor Terminal, Milford Sound 9679, New Zealand', query: 'Milford Sound Visitor Terminal', precision: 'address', source: 'https://www.realnz.com/en/contact-us/' },
    deer_park: { name: 'Deer Park Heights', address: 'Peninsula Road, Kelvin Heights, Queenstown, New Zealand', query: 'Deer Park Heights Queenstown', mapUrl: 'https://maps.app.goo.gl/qHRr1YcKoSEYtfch8', precision: 'entrance', source: 'https://deerparkheights.co.nz/visiting/', note: '请使用园区官方提供的地图入口链接；旧地图落点可能有误。' },
    queenstown: { name: '皇后镇', address: 'Queenstown, New Zealand', query: 'Queenstown New Zealand', precision: 'place-search' },
    glenorchy: { name: '格林诺奇', address: 'Glenorchy, New Zealand', query: 'Glenorchy New Zealand', precision: 'place-search' },
    glenorchy_wharf: { name: 'Glenorchy Wharf / Red Shed', address: 'Glenorchy waterfront, New Zealand', query: 'Glenorchy Wharf Red Shed', precision: 'place-search', source: 'https://www.queenstownnz.co.nz/plan/surrounding-region/glenorchy/', note: '官方旅游信息未提供街道门牌。' },
    wilson_bay: { name: 'Wilson Bay', address: 'Glenorchy Road, Queenstown, New Zealand', query: 'Wilson Bay Glenorchy Road Queenstown', precision: 'place-search', source: 'https://www.queenstownnz.co.nz/stories/post/top-picks-for-picnics-in-queenstown/', note: '皇后镇至格林诺奇路旁有路标的湖湾；无街道门牌。' },
    bennetts_bluff: { name: "Bennetts Bluff Viewpoint", address: 'Queenstown–Glenorchy Road, New Zealand', query: 'Bennetts Bluff Viewpoint', precision: 'entrance', source: 'https://www.doc.govt.nz/parks-and-recreation/places-to-go/otago/places/glenorchy-area/things-to-do/bennetts-bluff-view-point-walk/', note: 'DOC称停车场位于Queenstown与Glenorchy之间、道路中段。' },
    shotover_jet: { name: 'Shotover Jet Beach', address: '3 Arthurs Point Road, Arthurs Point, Queenstown, New Zealand', query: 'Shotover Jet Beach 3 Arthurs Point Road', precision: 'address', source: 'https://www.shotoverjet.com/about/contact-us/' },
    nzone: { name: 'NZONE Skydive check-in', address: '35 Shotover Street, Queenstown, New Zealand', query: 'NZONE Skydive 35 Shotover Street Queenstown', precision: 'address', source: 'https://www.nzoneskydive.co.nz/about/contact/', note: '这是市区签到办公室，跳伞场地另行接驳。' },
    skyline: { name: 'Skyline Queenstown', address: 'Brecon Street, Queenstown, New Zealand', query: 'Skyline Queenstown Brecon Street', precision: 'entrance', source: 'https://queenstown.skyline.co.nz/getting-here/', note: '官方未给门牌；第三方常列53号，未采用。' },
    gardens: { name: 'Queenstown Gardens', address: '52 Park Street, Queenstown, New Zealand', query: 'Queenstown Gardens 52 Park Street', precision: 'address', optional: true, source: 'https://www.qldc.govt.nz/media/1oenvwx3/queenstown-gardens-reserve-management-plan-amended-24-october-2024.pdf', note: '皇后镇短暂停留时的候补散步地点，按到达时间决定。' },
    zqn: { name: 'Queenstown Airport / rental return', address: 'Sir Henry Wigley Drive, Frankton, Queenstown 9300, New Zealand', query: 'Queenstown Airport Sir Henry Wigley Drive', precision: 'entrance', source: 'https://www.queenstownairport.co.nz/contact-us', note: '具体租车公司返还区/车位依预订和机场现场标识。' },
    pvg: { name: '上海浦东国际机场', address: null, query: 'Shanghai Pudong International Airport Arrivals', precision: 'place-search', source: 'https://www.shanghaiairport.com/enhq/ContactDetails/index.html', note: '机场集团地址不是已核实的旅客到达口。' }
  };

  const lodging = (id, name) => ({ id, name, address: null, query: null, precision: 'private-pending', note: name + '住宿地址需由用户从本地订单补充。' });
  Object.assign(places, {
    lodging_seoul: lodging('lodging_seoul', '首尔住宿'), lodging_chc: lodging('lodging_chc', '基督城住宿'), lodging_twizel: lodging('lodging_twizel', '特泽维尔住宿'),
    lodging_wanaka: lodging('lodging_wanaka', '瓦纳卡住宿'), lodging_te_anau: lodging('lodging_te_anau', '蒂阿瑙住宿'), lodging_queenstown: lodging('lodging_queenstown', '皇后镇住宿'), lodging_airport: lodging('lodging_airport', '首尔机场中转住宿')
  });

  const days = [
    { id: 'day-0', date: '2026-09-24', title: '上海→首尔', placeIds: ['sha_t1', 'gimpo', 'lodging_seoul'] },
    { id: 'day-1', date: '2026-09-25', title: '首尔→奥克兰', placeIds: ['gimpo', 'gyeongbokgung', 'myeongdong', 'hongdae', 'icn_t2'] },
    { id: 'day-2', date: '2026-09-26', title: '奥克兰→基督城', placeIds: ['akl_intl', 'akl_domestic', 'chc_airport', 'riverside_market', 'christchurch_botanic_gardens', 'new_world_durham_street', 'lodging_chc'] },
    { id: 'day-3', date: '2026-09-27', title: '基督城→蒂卡波→特泽维尔', placeIds: ['chc_airport', 'mt_john', 'tekapo_church', 'tekapo_lake', 'twizel', 'lodging_twizel'] },
    { id: 'day-4', date: '2026-09-28', title: '库克山冰川日', placeIds: ['pukaki_lookout', 'mt_cook_salmon', 'tasman_glacier', 'twizel', 'lodging_twizel'] },
    { id: 'day-5', date: '2026-09-29', title: '特泽维尔→瓦纳卡', placeIds: ['twizel', 'wanaka', 'wanaka_station', 'wanaka_tree', 'lodging_wanaka'] },
    { id: 'day-6', date: '2026-09-30', title: '瓦纳卡→皇后镇→蒂阿瑙', placeIds: ['wanaka', 'queenstown', 'gardens', 'te_anau', 'te_anau_freshchoice', 'lodging_te_anau'] },
    { id: 'day-7', date: '2026-10-01', title: '蒂阿瑙→米尔福德', placeIds: ['te_anau', 'eglinton_valley', 'mirror_lakes', 'pops_view', 'monkey_creek', 'homer_tunnel', 'milford_terminal', 'lodging_te_anau'] },
    { id: 'day-8', date: '2026-10-02', title: '蒂阿瑙→皇后镇', placeIds: ['te_anau', 'queenstown', 'deer_park', 'lodging_queenstown'] },
    { id: 'day-9', date: '2026-10-03', title: '皇后镇→格林诺奇', placeIds: ['queenstown', 'wilson_bay', 'bennetts_bluff', 'glenorchy', 'glenorchy_wharf', 'shotover_jet', 'lodging_queenstown'] },
    { id: 'day-10', date: '2026-10-04', title: '皇后镇活动日', placeIds: ['nzone', 'skyline', 'lodging_queenstown'] },
    { id: 'day-11', date: '2026-10-05', title: '皇后镇→奥克兰→首尔', placeIds: ['zqn', 'akl_domestic', 'akl_intl', 'icn_t2', 'lodging_airport'] },
    { id: 'day-12', date: '2026-10-06', title: '首尔→上海', placeIds: ['icn_t2', 'pvg'] }
  ];

  const events = [
    { id: 'd01-depart', dayId: 'day-0', date: '2026-09-24', time: '18:25', offset: '+08:00', zoneLabel: '上海时间', title: 'KE2058 从上海虹桥 T1 起飞', kind: 'flight', placeId: 'sha_t1', terminal: 'T1', flightNo: 'KE2058' },
    { id: 'd01-arrive', dayId: 'day-0', date: '2026-09-24', time: '21:30', offset: '+09:00', zoneLabel: '韩国时间', title: '抵达首尔金浦 GMP', kind: 'flight', phase: 'arrival', placeId: 'gimpo', flightNo: 'KE2058' },
    { id: 'd02-depart', dayId: 'day-1', date: '2026-09-25', time: '18:00', offset: '+09:00', zoneLabel: '韩国时间', title: 'KE411 从仁川 T2 起飞', kind: 'flight', placeId: 'icn_t2', terminal: 'T2', flightNo: 'KE411', note: '请按航司值机要求提前到达，金浦与仁川是不同机场。' },
    { id: 'd03-arrive-akl', dayId: 'day-2', date: '2026-09-26', time: '08:35', offset: '+12:00', zoneLabel: '新西兰标准时间', title: '抵达奥克兰国际航站楼', kind: 'flight', phase: 'arrival', placeId: 'akl_intl', terminal: 'International', flightNo: 'KE411' },
    { id: 'd03-depart-akl', dayId: 'day-2', date: '2026-09-26', time: '13:15', offset: '+12:00', zoneLabel: '新西兰标准时间', title: 'NZ543 从奥克兰国内航站楼起飞', kind: 'flight', placeId: 'akl_domestic', terminal: 'Domestic', flightNo: 'NZ543' },
    { id: 'd03-arrive-chc', dayId: 'day-2', date: '2026-09-26', time: '14:35', offset: '+12:00', zoneLabel: '新西兰标准时间', title: '抵达基督城', kind: 'flight', phase: 'arrival', placeId: 'chc_airport', flightNo: 'NZ543' },
    { id: 'd03-pickup', dayId: 'day-2', date: '2026-09-26', time: '15:30', offset: '+12:00', zoneLabel: '新西兰标准时间', title: '基督城取车与休整', kind: 'drive', placeId: 'chc_airport' },
    { id: 'd04-drive', dayId: 'day-3', date: '2026-09-27', time: '09:00', offset: '+13:00', zoneLabel: '新西兰夏令时间', title: '从基督城出发前往麦肯齐盆地', kind: 'drive', placeId: 'mt_john' },
    { id: 'd04-astro', dayId: 'day-3', date: '2026-09-27', time: null, offset: '+13:00', zoneLabel: '新西兰夏令时间', title: '约11:30抵达 Mt John Astro Café', kind: 'activity', placeId: 'mt_john', tentative: true },
    { id: 'd04-church', dayId: 'day-3', date: '2026-09-27', time: '14:00', offset: '+13:00', zoneLabel: '新西兰夏令时间', title: '蒂卡波湖与好牧羊人教堂', kind: 'activity', placeId: 'tekapo_church' },
    { id: 'd04-twizel', dayId: 'day-3', date: '2026-09-27', time: '17:00', offset: '+13:00', zoneLabel: '新西兰夏令时间', title: '前往特泽维尔', kind: 'drive', placeId: 'twizel' },
    { id: 'd05-plan', dayId: 'day-4', date: '2026-09-28', time: null, offset: '+13:00', zoneLabel: '新西兰夏令时间', title: '库克山冰川日（候补或 Plan B）', kind: 'activity', placeId: 'tasman_glacier', tentative: true, note: '候补通知与实际时刻未确定，不参与自动倒计时。' },
    { id: 'd05-return', dayId: 'day-4', date: '2026-09-28', time: null, offset: '+13:00', zoneLabel: '新西兰夏令时间', title: '傍晚返回特泽维尔', kind: 'drive', placeId: 'twizel', tentative: true },
    { id: 'd06-drive', dayId: 'day-5', date: '2026-09-29', time: '09:00', offset: '+13:00', zoneLabel: '新西兰夏令时间', title: '特泽维尔出发前往瓦纳卡', kind: 'drive', placeId: 'wanaka' },
    { id: 'd06-tree', dayId: 'day-5', date: '2026-09-29', time: '13:00', offset: '+13:00', zoneLabel: '新西兰夏令时间', title: '瓦纳卡湖畔与 That Wānaka Tree', kind: 'activity', placeId: 'wanaka_tree' },
    { id: 'd06-dinner', dayId: 'day-5', date: '2026-09-29', time: '18:00', offset: '+13:00', zoneLabel: '新西兰夏令时间', title: '瓦纳卡晚餐', kind: 'activity', placeId: 'wanaka' },
    { id: 'd07-drive', dayId: 'day-6', date: '2026-09-30', time: '09:00', offset: '+13:00', zoneLabel: '新西兰夏令时间', title: '瓦纳卡出发前往皇后镇', kind: 'drive', placeId: 'queenstown' },
    { id: 'd07-teanau', dayId: 'day-6', date: '2026-09-30', time: '15:30', offset: '+13:00', zoneLabel: '新西兰夏令时间', title: '皇后镇出发前往蒂阿瑙', kind: 'drive', placeId: 'te_anau' },
    { id: 'd07-checkin', dayId: 'day-6', date: '2026-09-30', time: '18:00', offset: '+13:00', zoneLabel: '新西兰夏令时间', title: '蒂阿瑙入住', kind: 'stay', placeId: 'lodging_te_anau', note: '采购补给请另行安排。' },
    { id: 'd08-drive', dayId: 'day-7', date: '2026-10-01', time: '09:00', offset: '+13:00', zoneLabel: '新西兰夏令时间', title: '蒂阿瑙出发前往米尔福德峡湾', kind: 'drive', placeId: 'milford_terminal', note: '沿途可停镜湖；出发前核对 SH94 与米尔福德公路状况。' },
    { id: 'd08-cruise', dayId: 'day-7', date: '2026-10-01', time: '12:00', offset: '+13:00', zoneLabel: '新西兰夏令时间', title: '米尔福德峡湾游船', kind: 'activity', placeId: 'milford_terminal', note: '需按实际运营商票面确认签到码头。' },
    { id: 'd08-return', dayId: 'day-7', date: '2026-10-01', time: '14:00', offset: '+13:00', zoneLabel: '新西兰夏令时间', title: '从米尔福德返回蒂阿瑙', kind: 'drive', placeId: 'te_anau' },
    { id: 'd09-drive', dayId: 'day-8', date: '2026-10-02', time: '09:00', offset: '+13:00', zoneLabel: '新西兰夏令时间', title: '蒂阿瑙出发返回皇后镇', kind: 'drive', placeId: 'queenstown' },
    { id: 'd09-deer', dayId: 'day-8', date: '2026-10-02', time: '13:30', offset: '+13:00', zoneLabel: '新西兰夏令时间', title: 'Deer Park Heights', kind: 'activity', placeId: 'deer_park', note: '导航请使用园区官方提供的新入口地图链接。' },
    { id: 'd10-glenorchy', dayId: 'day-9', date: '2026-10-03', time: '09:30', offset: '+13:00', zoneLabel: '新西兰夏令时间', title: '前往格林诺奇与沿途观景', kind: 'drive', placeId: 'bennetts_bluff' },
    { id: 'd10-jet', dayId: 'day-9', date: '2026-10-03', time: '14:30', offset: '+13:00', zoneLabel: '新西兰夏令时间', title: 'Shotover Jet 喷气快艇', kind: 'activity', placeId: 'shotover_jet' },
    { id: 'd11-nzone', dayId: 'day-10', date: '2026-10-04', time: '09:30', offset: '+13:00', zoneLabel: '新西兰夏令时间', title: 'NZONE 跳伞签到', kind: 'activity', placeId: 'nzone' },
    { id: 'd11-skyline', dayId: 'day-10', date: '2026-10-04', time: '16:00', offset: '+13:00', zoneLabel: '新西兰夏令时间', title: 'Skyline 缆车、Luge 与晚餐', kind: 'activity', placeId: 'skyline' },
    { id: 'd12-return-car', dayId: 'day-11', date: '2026-10-05', time: '06:00', offset: '+13:00', zoneLabel: '新西兰夏令时间', title: '皇后镇机场还车', kind: 'drive', placeId: 'zqn', note: '计划还车距07:00起飞只有一小时；请提前向租车公司与航司核对可行性。' },
    { id: 'd12-zqn', dayId: 'day-11', date: '2026-10-05', time: '07:00', offset: '+13:00', zoneLabel: '新西兰夏令时间', title: 'NZ638 从皇后镇起飞', kind: 'flight', placeId: 'zqn', flightNo: 'NZ638', note: '请提前核对值机截止时间与还车位置。' },
    { id: 'd12-akl', dayId: 'day-11', date: '2026-10-05', time: '08:50', offset: '+13:00', zoneLabel: '新西兰夏令时间', title: '抵达奥克兰', kind: 'flight', phase: 'arrival', placeId: 'akl_domestic', flightNo: 'NZ638', terminal: 'Domestic', note: '页面未明确后续转场细节。' },
    { id: 'd12-ke412', dayId: 'day-11', date: '2026-10-05', time: '12:05', offset: '+13:00', zoneLabel: '新西兰夏令时间', title: 'KE412 从奥克兰国际航站楼起飞', kind: 'flight', placeId: 'akl_intl', terminal: 'International', flightNo: 'KE412' },
    { id: 'd12-icn', dayId: 'day-11', date: '2026-10-05', time: '20:20', offset: '+09:00', zoneLabel: '韩国时间', title: '抵达仁川 T2', kind: 'flight', phase: 'arrival', placeId: 'icn_t2', terminal: 'T2', flightNo: 'KE412' },
    { id: 'd13-ke881', dayId: 'day-12', date: '2026-10-06', time: '08:25', offset: '+09:00', zoneLabel: '韩国时间', title: 'KE881 从仁川 T2 起飞', kind: 'flight', placeId: 'icn_t2', terminal: 'T2', flightNo: 'KE881' },
    { id: 'd13-pvg', dayId: 'day-12', date: '2026-10-06', time: '09:40', offset: '+08:00', zoneLabel: '上海时间', title: '抵达上海浦东', kind: 'flight', phase: 'arrival', placeId: 'pvg', flightNo: 'KE881' }
  ];

  const flightStatusUrls = {
    KE: 'https://www.koreanair.com/',
    NZ: 'https://www.airnewzealand.com/flight-tracker'
  };

  global.SouthernTrailData = { places, days, events, flightStatusUrls };
})(window);
