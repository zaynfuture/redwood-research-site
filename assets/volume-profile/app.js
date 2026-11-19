(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const en = document.documentElement.lang.startsWith('en');
  const tw = document.documentElement.lang === 'zh-TW';
  const tr = (zh, english, traditional) => en ? english : (tw && traditional ? traditional : zh);
  const labels = {
    local:tr('API 分析','API-backed analysis','API 分析'), refresh:tr('刷新行情分析','Refresh analysis','重新整理行情分析'),
    navFramework:tr('研究框架','Research framework','研究框架'),navCapabilities:tr('平台能力','Capabilities','平台能力'),navHome:tr('返回主站','Main site','返回主站'),
    productKicker:tr('REDWOOD / 成交结构','REDWOOD / MARKET STRUCTURE','REDWOOD / 成交結構'),titleLead:tr('筹码峰，','Volume,','籌碼峰，'),titleAccent:tr('置于证据之中。','in context.','置於證據之中。'),
    title:tr('筹码峰分布','Volume profile','籌碼峰分布'),subtitle:tr('先确认来源、时间与覆盖完整性，再把成交密集区与估值、因子、趋势和风险共同纳入判断。','Verify source, time, and coverage first. Then use traded-volume concentration alongside valuation, factors, trend, and risk.','先確認來源、時間與涵蓋完整性，再把成交密集區與估值、因子、趨勢和風險共同納入判斷。'),
    guideSearchTitle:tr('即时搜索代码','Search the directory','即時搜尋代碼'),guideSearch:tr('按股票代码或公司名检索 SEC 发行人目录。','Find SEC-listed issuers by ticker or company name.','按股票代碼或公司名檢索 SEC 發行人目錄。'),
    guideVerifyTitle:tr('先验证数据','Verify before viewing','先驗證資料'),guideVerify:tr('仅通过来源、时间、分页与合计校验的数据才显示筹码峰。','Profiles appear only after provenance, time, pagination, and reconciliation checks.','僅通過來源、時間、分頁與合計校驗的資料才顯示籌碼峰。'),
    guideDecideTitle:tr('多模型交叉判断','Use multiple lenses','多模型交叉判斷'),guideDecide:tr('筹码峰反映历史成交，不单独构成买卖信号。','Volume profile is historical context, not a standalone signal.','籌碼峰反映歷史成交，不單獨構成買賣訊號。'),
    sessionDate:tr('交易日期','Session date'),symbols:tr('股票搜索','Ticker search','股票搜尋'),dataset:tr('当前数据','Current data','目前資料'),restore:tr('恢复演示数据','Restore demo','還原演示資料'),
    chartTitle:tr('价格路径与筹码分布','Price path & volume profile','價格路徑與成交量分布'),table:tr('查看价格档','Price bins','查看價格檔'),shape:tr('窗口收盘位置分析','Window-close position','時段收盤位置分析'),notes:tr('计算口径与边界','Method and boundaries','計算口徑與邊界'),
    apiHelp:tr('股票代码确认后，Redwood 服务端会通过受控行情 API 获取延迟的 SIP 历史成交，执行内部完整性校验和筹码分布计算，然后仅返回派生分析。用户无需上传文件。','After a ticker is identified, Redwood retrieves delayed historical SIP trades through a controlled server-side API, runs internal completeness checks and volume-profile analysis, and returns only the derived result. No user upload is required.','股票代碼確認後，Redwood 伺服器會透過受控行情 API 取得延遲的 SIP 歷史成交，執行內部完整性檢查和成交量分布計算，再僅回傳衍生分析。使用者無需上傳檔案。'),
    directoryResult:tr('已识别股票代码','TICKER IDENTIFIED','已識別股票代碼'),noProfileTitle:tr('准备获取市场数据','Ready to analyze market data','準備取得市場資料'),noProfileCopy:tr('选择该股票后，系统会自动调用服务端行情 API、校验数据并计算筹码分布。','Select this ticker to let Redwood fetch, validate, and analyze market data automatically.','選擇此股票後，系統會自動呼叫伺服器行情 API、驗證資料並計算成交量分布。'),
    fetchProfile:tr('获取并分析','Fetch and analyze','取得並分析'),fetchingTitle:tr('正在分析市场数据','Analyzing market data','正在分析市場資料'),fetchingCopy:tr('系统正在获取延迟 SIP 成交并执行内部完整性校验。','Redwood is retrieving delayed SIP trades and running internal completeness checks.','系統正在取得延遲 SIP 成交並執行內部完整性檢查。'),errorTitle:tr('自动分析暂不可用','Automatic analysis unavailable','自動分析暫不可用'),errorCopy:tr('系统未展示未经授权或未通过校验的数据。无需手工上传，请稍后重试。','Redwood did not display unlicensed or unvalidated data. No manual upload is needed; retry later.','系統未顯示未經授權或未通過驗證的資料。無需手動上傳，請稍後重試。'),realtimeBoundary:tr('所有结果均为延迟历史成交分析，不是实时行情，也不代表当前持仓成本。公开展示需要数据供应商授权。','All results are delayed historical trade analysis—not live quotes or current holder cost basis. Public display requires provider authorization.','所有結果均為延遲歷史成交分析，不是即時行情，也不代表目前持倉成本。公開顯示需要資料供應商授權。'),
    auditKicker:tr('数据真实性校验','DATA AUTHENTICITY','資料真實性校驗'),auditTitle:tr('知道这张图能证明什么。','Know what the chart proves.','知道這張圖能證明什麼。'),auditOrigin:tr('来源与权限','Source & rights','來源與權限'),auditTime:tr('观察时间','Observation time','觀察時間'),auditChecks:tr('确定性校验','Deterministic checks','確定性校驗'),
    frameworkKicker:tr('研究模型','RESEARCH MODELS','研究模型'),frameworkTitle:tr('筹码峰不是答案，','Volume is one lens,','籌碼峰不是答案，'),frameworkAccent:tr('只是证据之一。','not the answer.','只是證據之一。'),frameworkCopy:tr('主流研究会将基本面、横截面因子、价格趋势、风险与事件催化剂组合使用。筹码峰适合解释历史成交结构，不负责预测未来。','Professional research combines fundamentals, cross-sectional factors, price trend, risk, and catalysts. Volume profile describes historical market structure; it does not forecast the future.','主流研究會將基本面、橫截面因子、價格趨勢、風險與事件催化劑組合使用。籌碼峰適合解釋歷史成交結構，不負責預測未來。'),
    modelValuation:tr('基本面与估值','Fundamentals & valuation','基本面與估值'),modelValuationCopy:tr('现金流、盈利质量、资本回报与情景估值。','Cash flow, earnings quality, returns on capital, and scenario valuation.','現金流、盈利品質、資本回報與情境估值。'),
    modelFactors:tr('多因子模型','Multi-factor model','多因子模型'),modelFactorsCopy:tr('市场、规模、价值、盈利与投资因子用于比较预期回报暴露。','Market, size, value, profitability, and investment exposures frame expected returns.','市場、規模、價值、盈利與投資因子用於比較預期回報曝險。'),
    modelTrend:tr('趋势与动量','Trend & momentum','趨勢與動量'),modelTrendCopy:tr('均线、相对强弱与多周期动量确认价格行为。','Moving averages, relative strength, and multi-horizon momentum confirm price behavior.','均線、相對強弱與多週期動量確認價格行為。'),
    modelRisk:tr('波动与风险','Volatility & risk','波動與風險'),modelRiskCopy:tr('波动率、回撤、流动性、集中度与情景压力测试。','Volatility, drawdown, liquidity, concentration, and scenario stress tests.','波動率、回撤、流動性、集中度與情境壓力測試。'),
    modelProfile:tr('成交量分布','Volume profile','成交量分布'),modelProfileCopy:tr('POC、70% 价值区与低/高成交节点描述市场曾在哪里达成交易。','POC, 70% value area, and volume nodes show where the market previously traded.','POC、70% 價值區與低／高成交節點描述市場曾在哪裡達成交易。'),
    modelCatalyst:tr('事件与催化剂','Events & catalysts','事件與催化劑'),modelCatalystCopy:tr('财报、指引、监管、行业与公司行动决定假设何时可能改变。','Earnings, guidance, regulation, industry shifts, and corporate actions can change assumptions.','財報、指引、監管、產業與公司行動決定假設何時可能改變。'),references:tr('方法参考','Method references','方法參考'),
    below:tr('末笔价格下方','Below last price','末筆價格下方'),at:tr('末笔价格所在档','At last-price bin','末筆價格所在檔'),above:tr('末笔价格上方','Above last price','末筆價格上方'),
    poc:tr('成交峰 POC','Peak · POC'),va:tr('70% 价值区间','70% value area','70% 價值區間'),close:tr('收盘价','Close','收盤價'),shares:tr('股数','Shares','股數'),percent:tr('占比','Percent'),
    hist:tr('历史成交','Historical trades','歷史成交'),sample:tr('模拟演示 · 非行情','Synthetic demo · not market data','模擬演示 · 非行情'),gap:tr('数据不完整','Incomplete data','資料不完整'),complete:tr('完整窗口','Complete window','完整時段'),
    hint:tr('指向左侧价格档或右侧价格曲线；聚焦后用方向键查看明细。','Inspect a profile row or the price path; use arrow keys after focusing the chart.','指向左側價格檔或右側價格曲線；聚焦後用方向鍵查看明細。'),
  };
  document.title = labels.title + ' · Redwood Research';
  document.querySelectorAll('[data-t]').forEach(el => { el.textContent = labels[el.dataset.t] || ''; });
  $('search').placeholder = tr('输入 AAPL、NVDA 或公司名','Enter AAPL, NVDA, or a company','輸入 AAPL、NVDA 或公司名');
  $('search').setAttribute('aria-label', $('search').placeholder);
  $('dismiss').setAttribute('aria-label',tr('关闭','Close','關閉'));
  $('methods').textContent = tr('价格档含下限、不含上限。POC 为成交股数最多的一档；70% 价值区从 POC 向相邻较高成交档扩展，成交量相同则取下方，直到覆盖至少 70%。价格路径和底部成交量由同一批已接受逐笔成交按 UTC 分钟精确聚合；横向柱的数字为该档占窗口总股数的真实比例。VWAP 按逐笔成交价与股数加权。分布只描述所选窗口内的历史交易，不能识别当前持有人或真实持仓成本。','Bins include the lower edge and exclude the upper. POC is the highest-volume bin. The 70% value area expands toward the larger adjacent bin, choosing the lower bin on a tie, until at least 70% is covered. The price path and lower volume band are exact UTC-minute aggregations of the same accepted prints; each horizontal label is that row’s true share of window volume. VWAP uses actual trade prices and shares. The profile describes historical transactions only; current holders and their cost basis are unobserved.','價格檔含下限、不含上限。POC 為成交股數最多的一檔；70% 價值區從 POC 向相鄰較高成交檔擴展，成交量相同則取下方，直到涵蓋至少 70%。價格路徑和底部成交量由同一批已接受逐筆成交按 UTC 分鐘精確聚合；橫向柱的數字為該檔佔時段總股數的真實比例。VWAP 按逐筆成交價與股數加權。分布只描述所選時段內的歷史交易，不能識別目前持有人或真實持倉成本。');

  const node = (tag, value, cls) => { const e = document.createElement(tag); if (value != null) e.textContent = value; if (cls) e.className = cls; return e; };
  const fmt = (n, digits=2) => n == null ? '—' : n.toLocaleString(en ? 'en-US' : 'zh-CN',{minimumFractionDigits:digits,maximumFractionDigits:digits});
  const price = (n,step=.01) => fmt(n,Math.max(2,Math.min(8,(String(step).split('.')[1]||'').length,8),step>0&&step<.01?Math.ceil(-Math.log10(step)):2));
  const pct = n => fmt(n,1)+'%';
  const signed = n => n == null ? '—' : (n>0?'+':'')+fmt(n)+'%';
  const compact = n => n==null?'—':new Intl.NumberFormat(en?'en-US':'zh-CN',{notation:'compact',maximumFractionDigits:2}).format(n);
  const classes = n => n>0?'positive':n<0?'negative':'';
  const clock = stamp => new Date(stamp.replace(/(\.\d{3})\d+/, '$1')).toLocaleTimeString('en-GB',{timeZone:'America/New_York',hour:'2-digit',minute:'2-digit',hour12:false});
  const stamp = value => value ? new Date(value.replace(/(\.\d{3})\d+/, '$1')).toLocaleString(en?'en-US':'zh-CN',{timeZone:'America/New_York',hour12:false})+' ET' : '—';
  const gapNames = {pagination_incomplete:tr('分页未取完','Pagination incomplete','分頁尚未取完'),conflicting_trade_identity:tr('成交编号冲突','Conflicting trade IDs','成交編號衝突'),invalid_trade_record:tr('成交记录无效','Invalid trade record','成交記錄無效'),acquisition_incomplete:tr('数据获取中断','Retrieval interrupted','資料取得中斷'),time_bar_budget_exceeded:tr('分钟曲线超出边界','Minute-path budget exceeded','分鐘曲線超出邊界'),no_eligible_trades:tr('窗口内无有效成交','No eligible trades','時段內無有效成交')};
  const standard = {'regular-session':tr('全天','Full session'), 'closing-half-hour':tr('尾盘 30 分钟','Final 30 min','尾盤 30 分鐘')};
  const nameOf = p => standard[p.window] || (clock(p.start)+'–'+clock(p.end)+' ET');
  const period = p => p.window==='regular-session'?'09:30–16:00 ET':p.window==='closing-half-hour'?'15:30–16:00 ET':nameOf(p);
  const key = p => [p.symbol,p.start,p.end,p.step].join('|');
  const initial = JSON.parse($('profile-initial').textContent);
  const directory = JSON.parse($('symbol-directory').textContent);
  const directoryBySymbol = new Map(directory.symbols.map(row => [row.s,row]));
  $('directory-note').textContent = tr('SEC 发行人目录','SEC issuer directory','SEC 發行人目錄')+' · '+directory.symbols.length.toLocaleString()+' · '+directory.asOf;
  let dataset, isDemo, names, selected, day, current, preferred, directorySelected=null, loadingSymbol=null, failedSymbol=null, requestVersion=0, cleanup=null, unit='percent', tablePage=0;
  const visible = {showVA:true,showVwap:true,showClose:true};
  function reset() {
    dataset=ProfileModel.parse(initial.documents);isDemo=initial.demo===true;names=initial.names||{};selected=initial.selectedSymbol;current=null;preferred='regular-session';day=dataset.profiles.map(p=>p.date).sort((a,b)=>a.localeCompare(b)).pop();directorySelected=null;loadingSymbol=null;failedSymbol=null;
    $('search').value='';message('');render();
  }
  function message(text) {$('notice').textContent=text;$('notice').hidden=!text;}
  function button(text,pressed,fn) {const b=node('button',text);b.type='button';b.setAttribute('aria-pressed',String(pressed));b.onclick=fn;return b;}
  const context = p => ProfileModel.contextFor(p,dataset.contexts);
  const companyName = symbol => names[symbol] || directoryBySymbol.get(symbol)?.n || '';
  function setSymbol(sym) {directorySelected=null;selected=sym;current=null;$('search').value='';render();}
  function setDirectorySymbol(row) {directorySelected=row;selected=row.s;current=null;$('search').value=row.s;void fetchProfile(row);}
  const optionOrder=p=>p.window==='regular-session'?0:p.window==='closing-half-hour'?1:2;

  function directoryResults(symbols, available, p) {
    const query=$('search').value.trim().toLowerCase();
    let rows;
    if(!query){
      rows=symbols.map(s=>directoryBySymbol.get(s)||{s,n:companyName(s),e:'',c:null});
    }else{
      rows=directory.symbols.filter(r=>(r.s+' '+r.n).toLowerCase().includes(query)).sort((a,b)=>{
        const q=query.toUpperCase();
        const rank=r=>r.s===q?0:r.s.startsWith(q)?1:r.n.toUpperCase().startsWith(q)?2:3;
        return rank(a)-rank(b)||a.s.localeCompare(b.s);
      }).slice(0,32);
      for(const s of symbols){if((s+' '+companyName(s)).toLowerCase().includes(query)&&!rows.some(r=>r.s===s))rows.unshift({s,n:companyName(s),e:'',c:null});}
    }
    $('symbol-count').textContent=query?String(rows.length):String(symbols.length);
    $('symbols').replaceChildren(...rows.map(row=>{
      const loaded=symbols.includes(row.s),profile=loaded?(available.find(x=>x.symbol===row.s&&x.window===p?.window)||available.find(x=>x.symbol===row.s)):null,c=profile?context(profile):null;
      const b=button('',row.s===selected,()=>loaded?setSymbol(row.s):setDirectorySymbol(row));b.className='sym'+(row.s===selected?' active':'');
      const left=node('span'),right=node('span',null,loaded?'quote':'directory-tag');left.append(node('strong',row.s));if(row.n)left.append(node('small',row.n));
      if(loaded)right.append(node('span',price(c?.close)),node('small',signed(c?.dayChange),'chg '+classes(c?.dayChange)));else right.textContent=row.e||tr('目录','Directory','目錄');
      b.append(left,right);return b;
    }));
    if(!rows.length)$('symbols').append(node('p',tr('SEC 目录中未找到匹配项','No match in the SEC directory','SEC 目錄中找不到匹配項'),'empty'));
  }

  function auditList(items){$('audit-list').replaceChildren(...items.map(item=>node('li',item)));}
  async function fetchProfile(row) {
    const version=++requestVersion;
    directorySelected=row;selected=row.s;current=null;loadingSymbol=row.s;failedSymbol=null;message('');render();
    try{
      const response=await fetch('/api/volume-profile?symbol='+encodeURIComponent(row.s),{headers:{accept:'application/json'}});
      const body=await response.json();
      if(!response.ok)throw new Error(body?.error?.code||'market_data_unavailable');
      const added=ProfileModel.parse(body.profile);
      if(!added.profiles.length)throw new Error('empty_profile');
      if(version!==requestVersion)return;
      const baseProfiles=isDemo?[]:dataset.profiles,baseContexts=isDemo?[]:dataset.contexts;
      const byKey=new Map(baseProfiles.map(p=>[key(p),p]));
      added.profiles.forEach(p=>byKey.set(key(p),p));
      dataset={profiles:[...byKey.values()],contexts:[...baseContexts,...added.contexts]};
      if(isDemo)names={};names[row.s]=row.n;isDemo=false;directorySelected=null;failedSymbol=null;
      selected=added.profiles[0].symbol;day=added.profiles[0].date;current=key(added.profiles[0]);preferred=added.profiles[0].window;
      message('Market data retrieved and analyzed by Redwood.');
    }catch{
      if(version!==requestVersion)return;
      failedSymbol=row.s;message(labels.errorCopy);
    }finally{
      if(version===requestVersion){loadingSymbol=null;render();}
    }
  }
  function renderUnavailable(row) {
    cleanup?.();cleanup=null;$('profile-details').hidden=true;$('unavailable').hidden=false;$('insight').hidden=true;
    const loading=loadingSymbol===row.s,failed=failedSymbol===row.s;
    $('ticker').textContent=row.s;$('company').textContent=row.n;$('badge').textContent=loading?'API request in progress':failed?'Analysis unavailable':'Ticker identity verified';$('timing').textContent=row.e||'SEC';$('windows').replaceChildren();
    $('unavailable-title').textContent=loading?labels.fetchingTitle:failed?labels.errorTitle:labels.noProfileTitle;
    $('unavailable-copy').textContent=loading?labels.fetchingCopy:failed?labels.errorCopy:labels.noProfileCopy;
    $('fetch-empty').textContent=loading?'Analyzing…':failed?'Retry automatic analysis':labels.fetchProfile;$('fetch-empty').disabled=loading;
    $('source-name').textContent=loading?'Redwood market-data API':tr('SEC 发行人目录','SEC issuer directory','SEC 發行人目錄');$('source-meta').textContent=loading?'Delayed SIP retrieval and validation':directory.asOf+' · '+tr('不是行情数据','not market data','不是行情資料');$('restore').hidden=true;
    $('audit-verdict').textContent=tr('没有市场数据','No market data','沒有市場資料');$('audit-source').textContent=tr('SEC 代码与发行人映射','SEC ticker-to-issuer mapping','SEC 代碼與發行人映射');$('audit-rights').textContent=tr('公开目录；不含成交记录','Public directory; no trades','公開目錄；不含成交紀錄');$('audit-asof').textContent=directory.asOf;$('audit-window').textContent=tr('未连接成交窗口','No trade window connected','未連接成交時段');auditList([tr('股票代码与公司名匹配','Ticker and issuer matched','股票代碼與公司名匹配')]);$('audit-caveat').textContent=labels.realtimeBoundary;
  }

  function renderAudit(p) {
    const synthetic=isDemo;
    $('audit-verdict').textContent=synthetic?tr('模拟数据','Synthetic','模擬資料'):(p.complete?tr('结构校验通过','Structure validated','結構校驗通過'):tr('未通过完整性校验','Incomplete','未通過完整性校驗'));
    $('audit-source').textContent=synthetic?tr('虚构成交样本','Fictional trade sample','虛構成交樣本'):p.source;
    $('audit-rights').textContent=synthetic?tr('仅用于界面演示，不是市场行情','Interface demo only; not market data','僅用於介面演示，不是市場行情'):(p.rightsDecision+' · '+(p.networkChecked?tr('Redwood 网络获取','network fetched by Redwood','Redwood 網路取得'):tr('调用方提供文件','caller-supplied file','呼叫方提供檔案')));
    $('audit-asof').textContent=stamp(p.asOf);$('audit-window').textContent=period(p)+' · '+p.sources.length+' '+tr('个来源页','source page(s)','個來源頁');
    const items=[tr('价格网格连续且档宽一致','Aligned, contiguous price grid','價格網格連續且檔寬一致'),tr('各档成交量与总股数相符','Price-bin shares reconcile to total','各檔成交量與總股數相符'),synthetic?'The illustrative minute path is synthetic and never mixed with provider results':tr('分钟价格与成交量由同一批逐笔成交聚合','Minute price and volume reconcile to the same accepted prints','分鐘價格與成交量由同一批逐筆成交聚合'),synthetic?'Synthetic levels are a fixed interface fixture':'POC, value area, and position analysis are supplied by Redwood Research'];
    if(p.complete)items.push(tr('分页、时间戳、来源哈希与质量状态通过','Pagination, timestamps, page hashes, and quality status pass','分頁、時間戳、來源雜湊與品質狀態通過'));else items.push(tr('最终筹码水平已被系统扣留','Final levels withheld','最終籌碼水準已被系統扣留'));
    auditList(items);
    $('audit-caveat').textContent=synthetic?tr('当前公开页面默认展示虚构股票与虚构成交，不能用于投资判断。','The public page starts with fictional tickers and fictional trades; it is not investment data.','目前公開頁面預設顯示虛構股票與虛構成交，不能用於投資判斷。'):tr('这些校验证明文件内部一致，但保存的 JSON 不是数据供应商的数字签名。公开实时展示仍需供应商与交易所授权。','These checks prove internal consistency, but saved JSON is not a provider-signed attestation. Public real-time display still requires provider and exchange licensing.','這些校驗證明檔案內部一致，但儲存的 JSON 不是資料供應商的數位簽章。公開即時顯示仍需供應商與交易所授權。');
  }

  function render() {
    const available=dataset.profiles.filter(p=>p.date===day),symbols=[...new Set(available.map(p=>p.symbol))].sort((a,b)=>a.localeCompare(b));
    if(!directorySelected&&!symbols.includes(selected))selected=symbols[0];
    const choices=available.filter(p=>p.symbol===selected).sort((a,b)=>optionOrder(a)-optionOrder(b)||a.start.localeCompare(b.start)||a.step-b.step);
    const p=choices.find(x=>key(x)===current)||choices.find(x=>x.window===preferred)||choices[0];
    const dates=[...new Set(dataset.profiles.map(x=>x.date))].sort((a,b)=>b.localeCompare(a));$('date').replaceChildren(...dates.map(x=>{const o=node('option',x);o.value=x;return o;}));$('date').value=day;
    directoryResults(symbols,available,p);
    if(directorySelected&&!p){renderUnavailable(directorySelected);return;}
    if(!p)return;
    current=key(p);$('profile-details').hidden=false;$('unavailable').hidden=true;$('insight').hidden=false;
    $('ticker').textContent=p.symbol;$('company').textContent=companyName(p.symbol);$('badge').textContent=isDemo?labels.sample:(p.complete?'Exact accepted prints':labels.gap);$('timing').textContent=period(p)+(isDemo?' · illustrative 1-minute path':' · exact 1-minute path')+' · USD';
    $('source-name').textContent=isDemo?labels.sample:p.source;$('source-meta').textContent=isDemo?tr('虚构标的与成交数据','Fictional instruments and trades','虛構標的與成交資料'):(p.sources.length+' '+tr('个已哈希来源页','hashed source page(s)','個已雜湊來源頁'));$('restore').hidden=true;
    $('windows').replaceChildren(...choices.map(x=>{const dup=choices.filter(a=>a.window===x.window).length>1,b=button(nameOf(x)+(dup?' · '+price(x.step,x.step):''),key(x)===current,()=>{current=key(x);preferred=x.window;render();});b.title=period(x)+' · '+x.status;return b;}));
    const c=context(p),analysis=p.analysis,displayLast=isDemo?(c?.close??null):(analysis?.reference.price??null),reference=displayLast,range=b=>b?price(b.lower,p.step)+'–'+price(b.upper,p.step):'—',kpi=(label,value,sub)=>{const e=node('div',null,'kpi');e.append(node('span',label),node('b',value),node('small',sub));return e;};
    $('kpis').replaceChildren(kpi(labels.poc,range(p.poc),p.poc?pct(p.poc.percent)+' '+tr('窗口成交量','of window shares','時段成交量'):labels.gap),kpi(labels.va,range(p.valueArea),p.valueArea?pct(p.valueArea.percent)+' '+tr('实际覆盖','actual coverage','實際涵蓋'):labels.gap),kpi(isDemo?'Synthetic close':'Last accepted price',price(displayLast),isDemo?'Illustrative path only':analysis?analysis.timeBarCount+' exact 1-minute bars':'Backend analysis unavailable'),kpi(tr('窗口成交量','Window volume','時段成交量'),compact(p.totalShares),fmt(p.accepted,0)+' '+tr('笔成交','trades','筆成交')));
    $('bin-step').textContent=tr('档宽','Bin size','檔寬')+' $'+price(p.step,p.step);$('units').replaceChildren(...['percent','shares'].map(u=>button(labels[u],unit===u,()=>{unit=u;render();})));
    function legend(label,css,opt,enabled=true){const e=opt?button('',visible[opt]&&enabled,()=>{visible[opt]=!visible[opt];render();}):node('span');if(opt)e.disabled=!enabled;e.append(node('i',null,'swatch '+css),node('span',label));return e;}
    $('legend').replaceChildren(legend(labels.poc,'poc'),legend(labels.va,'va','showVA',p.complete),legend('VWAP','vwap','showVwap',p.complete),legend('Price path','price'),legend('Time volume','volume'));
    cleanup?.();$('chart').replaceChildren();$('inspect').textContent=labels.hint;
    if(p.complete){cleanup=ProfileChart.render($('chart'),p,{...visible,unit,synthetic:isDemo,syntheticClose:displayLast,onInspect:b=>{$('inspect').textContent=!b?labels.hint:b.time?new Date(b.time).toLocaleTimeString('en-US',{timeZone:'America/New_York',hour:'2-digit',minute:'2-digit'})+' ET · $'+price(b.close)+' · '+fmt(b.shares,0)+' shares':range(b)+' USD · '+fmt(b.shares,0)+' '+labels.shares+' · '+pct(b.percent);}});}else{cleanup=null;const box=node('div',null,'empty');box.append(node('h3',labels.gap),node('p',tr('该窗口未通过完整性检查，无法确定成交峰。','This window did not pass validation. Final levels are unavailable.','此時段未通過完整性檢查，無法確定成交峰。')),node('small',p.gaps.map(g=>gapNames[g]||g).join(' · ')));$('chart').append(box);$('inspect').textContent=tr('剩余价格档仅供核查','Available bins are diagnostic','現有價格檔僅供核查');}
    $('open-table').disabled=!p.bins.length;$('close-ref').textContent=reference!=null?(isDemo?'Synthetic close  $':'Last accepted  $')+price(reference):'';const body=$('insight-body');body.replaceChildren();
    if(!p.complete)body.append(node('p',labels.gap,'brief'));
    else if(isDemo){body.append(node('p','Synthetic interface fixture only. Distribution analysis is shown after Redwood Research returns an API-backed result.','brief'));}
    else if(analysis){const entries=[analysis.distribution.below,analysis.distribution.at,analysis.distribution.above],bar=node('div',null,'distribution'),caption=node('div',null,'distribution-labels');[labels.below,labels.at,labels.above].forEach((l,i)=>{const item=entries[i],band=node('i');band.style.flexGrow=String(item.percent);band.style.flexBasis='0';bar.append(band);const cap=node('span');cap.append(l+' ',node('b',pct(item.percent)));caption.append(cap);});body.append(bar,caption);body.append(node('p','The last accepted price was '+analysis.position.poc+' the POC bin and '+analysis.position.valueArea+' the 70% value area.','brief'));}
    else body.append(node('p','Backend analysis is unavailable for this profile.','brief'));
    renderAudit(p);
  }

  function showTable(){const p=dataset.profiles.find(x=>key(x)===current);if(!p)return;const rows=[...p.bins].reverse(),pageSize=60,maxPage=Math.max(0,Math.ceil(rows.length/pageSize)-1);tablePage=Math.max(0,Math.min(maxPage,tablePage));const table=node('table'),head=node('thead'),hr=node('tr');[tr('价格区间（美元）','Price interval (USD)','價格區間（美元）'),labels.shares,labels.percent].forEach(t=>hr.append(node('th',t)));head.append(hr);table.append(head);const body=node('tbody');rows.slice(tablePage*pageSize,(tablePage+1)*pageSize).forEach(b=>{const row=node('tr');if(b.lower===p.poc?.lower)row.className='peak';row.append(node('td','['+price(b.lower,p.step)+', '+price(b.upper,p.step)+')'),node('td',fmt(b.shares,0)),node('td',pct(b.percent)));body.append(row);});table.append(body);const wrap=$('table-wrap');wrap.replaceChildren();if(maxPage){const pager=node('div',null,'pager'),prev=button('‹',false,()=>{tablePage--;showTable();}),next=button('›',false,()=>{tablePage++;showTable();});prev.disabled=!tablePage;next.disabled=tablePage===maxPage;prev.setAttribute('aria-label',tr('上一页','Previous page','上一頁'));next.setAttribute('aria-label',tr('下一页','Next page','下一頁'));pager.append(prev,node('span',(tablePage+1)+' / '+(maxPage+1)),next);wrap.append(pager);}wrap.append(table);wrap.scrollTop=0;}
  $('date').onchange=e=>{day=e.target.value;current=null;directorySelected=null;render();};
  $('search').oninput=()=>{if(directorySelected&&$('search').value.trim().toUpperCase()!==directorySelected.s)directorySelected=null;render();};
  $('search').onkeydown=e=>{if(e.key!=='Enter')return;const symbol=$('search').value.trim().toUpperCase(),row=directoryBySymbol.get(symbol);if(row){e.preventDefault();setDirectorySymbol(row);}};
  $('open-table').onclick=()=>{tablePage=0;showTable();$('table-dialog').showModal();};
  $('dismiss').onclick=()=>$('table-dialog').close();
  $('restore').onclick=reset;
  $('fetch-empty').onclick=()=>{if(directorySelected)void fetchProfile(directorySelected);};
  $('refresh').onclick=()=>{const row=directoryBySymbol.get(selected);if(row)void fetchProfile(row);};
  reset();
})();
