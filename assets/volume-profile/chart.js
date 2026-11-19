/* Historical price-by-volume plot. Inputs are normalized local ProfileModel objects. */
(() => {
  "use strict";

  const NS = "http://www.w3.org/2000/svg";
  const instances = new WeakMap();
  const ink = "#34322f";
  const colors = {
    peak: "#a63d2c", value: "#c98273", outside: "#d8d2c9",
    valueBand: "#f7e9e5", grid: "#e4dfd7", muted: "#66645e",
    volumeLine: "#aaa39a", vwap: "#bd6d4e", highlight: "#7f3125",
  };
  const copy = {
    en: { chart: "Price-by-volume distribution", price: "Price · USD", shares: "Volume (shares)",
      percent: "Share of volume (%)", empty: "No price bins available", close: "Close",
      instructions: "Use the up and down arrow keys to inspect price bins.", bin: "price bin",
      native: "original bins", partial: "Partial volume", perRow: "original bins per bar" },
    zh: { chart: "按价格分布的成交量", price: "价格 · USD", shares: "成交量（股）",
      percent: "成交量占比（%）", empty: "暂无可展示的价格档", close: "收盘",
      instructions: "使用上下方向键逐档查看成交量。", bin: "价格档",
      native: "个原始价格档", partial: "部分成交量", perRow: "个原始价格档合为一条" },
    "zh-TW": { chart: "按價格分布的成交量", price: "價格 · USD", shares: "成交量（股）",
      percent: "成交量占比（%）", empty: "暫無可顯示的價格檔", close: "收盤",
      instructions: "使用上下方向鍵逐檔查看成交量。", bin: "價格檔",
      native: "個原始價格檔", partial: "部分成交量", perRow: "個原始價格檔合為一條" },
  };

  function svgNode(name, attributes = {}, text) {
    const node = document.createElementNS(NS, name);
    for (const [key, value] of Object.entries(attributes)) node.setAttribute(key, String(value));
    if (text !== undefined) node.textContent = text;
    return node;
  }

  function label(parent, x, y, text, props = {}) {
    const node = svgNode("text", { x, y, fill: colors.muted, "font-size": 12,
      "dominant-baseline": "middle", ...props }, text);
    parent.append(node);
    return node;
  }

  function groupBins(bins, maximum) {
    const stride = Math.max(1, Math.ceil(bins.length / maximum));
    const groups = [];
    for (let start = 0; start < bins.length; start += stride) {
      const stop = Math.min(bins.length, start + stride);
      let shares = 0;
      let percent = 0;
      for (let i = start; i < stop; i++) {
        shares += bins[i].shares;
        percent += bins[i].percent;
      }
      groups.push({ lower: bins[start].lower, upper: bins[stop - 1].upper,
        binCount: stop - start, shares, percent });
    }
    return { groups, stride };
  }

  function niceStep(raw) {
    if (!(raw > 0)) return 1;
    const factor = 10 ** Math.floor(Math.log10(raw));
    const unit = raw / factor;
    return (unit <= 1 ? 1 : unit <= 2 ? 2 : unit <= 2.5 ? 2.5 : unit <= 5 ? 5 : 10) * factor;
  }

  function render(host, profile, options = {}) {
    instances.get(host)?.();
    const language = (options.lang || document.documentElement.lang || "en").toLowerCase();
    const zh = language.startsWith("zh");
    const traditional = language === "zh-tw" || language.startsWith("zh-hant");
    const t = copy[traditional ? "zh-TW" : zh ? "zh" : "en"];
    const locale = traditional ? "zh-TW" : zh ? "zh-CN" : "en-US";
    const integer = new Intl.NumberFormat(locale, { maximumFractionDigits: 0 });
    const compact = new Intl.NumberFormat(locale, { notation: "compact", maximumFractionDigits: 1 });
    const precision = Math.min(8, Math.max(2,
      ...(profile?.bins?.length ? [profile.step, profile.bins[0].lower].map(value => {
        const text = Number(value).toFixed(8).replace(/0+$/, "");
        return (text.split(".")[1] || "").length;
      }) : [2])));
    const prices = new Intl.NumberFormat(locale, { minimumFractionDigits: precision, maximumFractionDigits: precision });
    const price = number => prices.format(number);
    const pct = number => (number > 0 && number < 0.01 ? "<0.01%" : number.toFixed(2) + "%");
    const root = svgNode("svg", { role: "img", "aria-label": t.chart, width: "100%",
      "font-family": "inherit", style: "display:block;width:100%;max-width:100%;font-variant-numeric:tabular-nums" });
    host.replaceChildren(root);
    let selected = -1;
    let layout = null;
    let redrawFrame = 0;
    let lastLayoutKey = "";
    let currentGroupCount = 0;

    function clearInspection() {
      selected = -1;
      if (layout) {
        layout.inspection.replaceChildren();
        root.removeAttribute("aria-valuetext");
      }
      options.onInspect?.(null);
    }

    function draw() {
      const width = Math.max(220, Math.round(host.getBoundingClientRect().width || 640));
      const narrow = width < 480;
      root.style.height = 'var(--profile-chart-height, ' + (narrow ? 360 : 405) + 'px)';
      const height = Math.max(200, Math.round(root.getBoundingClientRect().height || 405));
      const key = width + ":" + height;
      if (key === lastLayoutKey) return;
      lastLayoutKey = key;
      root.setAttribute("viewBox", "0 0 " + width + " " + height);
      root.replaceChildren(svgNode("title", {}, t.chart), svgNode("desc", {}, t.instructions));
      const bins = profile?.bins || [];
      if (!bins.length) {
        label(root, width / 2, height / 2, t.empty, { "text-anchor": "middle" });
        return;
      }
      const complete = profile.complete === true;
      const bottom = height - 49, top = 31;
      const rowTarget = Math.max(12, Math.floor((bottom - top) / 6));
      const { groups, stride } = groupBins(bins, rowTarget);
      const low = groups[0].lower;
      const high = groups[groups.length - 1].upper;
      const axisLabelSize = Math.max(price(low).length, price(high).length);
      const left = Math.min(width * 0.36, Math.max(43, axisLabelSize * 7.3 + 10));
      const right = width - (narrow ? 55 : 74);
      const y = value => bottom - (value - low) / (high - low) * (bottom - top);
      const isShares = options.unit === "shares";
      const getX = group => isShares ? group.shares : group.percent;
      const max = Math.max(...groups.map(getX));
      const xStep = niceStep(max / (narrow ? 3 : 5));
      const xMax = Math.max(xStep, Math.ceil(max / xStep) * xStep);
      const x = value => left + value / xMax * (right - left);

      const valueArea = complete && options.showVA !== false ? profile.valueArea : null;
      if (valueArea) {
        root.append(svgNode("rect", { x: left, y: y(valueArea.upper), width: right - left,
          height: y(valueArea.lower) - y(valueArea.upper), fill: colors.valueBand }));
        root.append(svgNode("line", { x1: left - 2, x2: left - 2, y1: y(valueArea.upper), y2: y(valueArea.lower),
          stroke: colors.value, "stroke-width": 2 }));
      }

      label(root, 0, 13, t.price, { "font-size": 12 });
      if (stride > 1 || !complete) {
        const note = [!complete ? t.partial : "", stride > 1 ? "≤" + stride + " " + t.perRow : ""].filter(Boolean).join(" · ");
        label(root, right, 13, note, { "text-anchor": "end", "font-size": 12 });
      }
      for (let n = 0; n <= Math.round(xMax / xStep); n++) {
        const value = n * xStep;
        const at = x(value);
        root.append(svgNode("line", { x1: at, x2: at, y1: top, y2: bottom, stroke: colors.grid,
          "stroke-dasharray": n === 0 ? "none" : "2 4" }));
        const text = isShares ? compact.format(value) : Number(value.toPrecision(4)) + "%";
        label(root, at, bottom + 14, text, { "text-anchor": "middle", "font-size": 12 });
      }
      label(root, (left + right) / 2, height - 8, isShares ? t.shares : t.percent, { "text-anchor": "middle" });

      const tickStep = Math.max(10 ** -precision, niceStep((high - low) / Math.min(8, Math.max(3, Math.floor((bottom - top) / 44)))));
      const firstTick = Math.ceil(low / tickStep - 1e-8);
      const finalTick = Math.floor(high / tickStep + 1e-8);
      for (let i = 0; i < 16 && i <= finalTick - firstTick; i++) {
        const v = (firstTick + i) * tickStep;
        const at = y(v);
        root.append(svgNode("line", { x1: left - 4, x2: left, y1: at, y2: at, stroke: colors.volumeLine }));
        label(root, left - 8, at, price(v), { "text-anchor": "end", fill: ink, "font-size": 12 });
      }
      const peak = complete ? profile.poc : null;
      for (const band of groups) {
        if (!band.shares) continue;
        const h = y(band.lower) - y(band.upper);
        const gap = Math.min(2, h * 0.22);
        const isPeak = peak && band.binCount === 1 && band.lower === peak.lower;
        const inValue = valueArea && band.lower >= valueArea.lower && band.upper <= valueArea.upper;
        root.append(svgNode("rect", { x: left, y: y(band.upper) + gap / 2,
          width: Math.max(0.65, x(getX(band)) - left), height: Math.max(0.4, h - gap),
          fill: isPeak ? colors.peak : inValue ? colors.value : colors.outside }));
      }
      root.append(svgNode("line", { x1: left, x2: right, y1: bottom, y2: bottom, stroke: colors.volumeLine }));

      const marks = [];
      if (peak) marks.push({ value: (peak.lower + peak.upper) / 2, text: "POC", color: colors.peak, dash: "2 3",
        title: "POC [" + price(peak.lower) + ", " + price(peak.upper) + ")" });
      if (complete && options.showVwap !== false && Number.isFinite(profile.vwap)) {
        marks.push({ value: profile.vwap, text: "VWAP", color: colors.vwap, dash: "6 4", title: "VWAP " + price(profile.vwap) });
      }
      if (options.showClose !== false && Number.isFinite(options.close) && options.close > 0) {
        marks.push({ value: options.close, text: t.close, color: ink, dash: "2 3", title: t.close + " " + price(options.close) });
      }
      for (const m of marks) m.at = Math.max(top, Math.min(bottom, y(m.value)));
      marks.sort((a,b) => a.at - b.at);
      let lastTag = top - 24;
      for (const m of marks) {
        m.tag = Math.max(top + 7, m.at, lastTag + 20);
        lastTag = m.tag;
      }
      let nextTag = bottom + 13;
      for (let i = marks.length - 1; i >= 0; i--) {
        marks[i].tag = Math.min(marks[i].tag, nextTag - 20);
        nextTag = marks[i].tag;
      }
      for (const m of marks) {
        const outside = m.value < low || m.value > high;
        if (!outside) root.append(svgNode("line", { x1: left, x2: right, y1: m.at, y2: m.at,
          stroke: m.color, "stroke-width": 1.2, "stroke-dasharray": m.dash }));
        const tagX = right + (narrow ? 6 : 10);
        root.append(svgNode("path", { d: 'M' + right + ' ' + m.at + ' L' + tagX + ' ' + m.tag,
          fill: "none", stroke: m.color }));
        const box = svgNode("g", { "aria-label": m.title });
        box.append(svgNode("title", {}, m.title));
        const isPeak = m.text === "POC";
        const tagWidth = (m.text === "VWAP" ? 42 : 38) + (outside ? 6 : 0);
        box.append(svgNode("rect", { x: tagX, y: m.tag - 8, width: tagWidth, height: 16,
          rx: 3, fill: isPeak ? colors.peak : "#fffdf8", stroke: isPeak ? colors.peak : m.color, "stroke-width": .8 }));
        const arrow = outside ? (m.value < low ? "↓" : "↑") : "";
        label(box, tagX + tagWidth / 2, m.tag + .4, m.text + arrow,
          { "text-anchor": "middle", "font-size": 10, "font-weight": 650, fill: isPeak ? "white" : m.color });
        root.append(box);
      }
      const inspection = svgNode("g", { "pointer-events": "none", "aria-hidden": "true" });
      root.append(inspection);
      currentGroupCount = groups.length;
      layout = { left, right, top, bottom, y, groups, low, high, inspection, width, height };
      root.setAttribute("role", "slider");
      root.setAttribute("aria-orientation", "vertical");
      root.setAttribute("aria-valuemin", "1");
      root.setAttribute("aria-valuemax", String(currentGroupCount));
      root.setAttribute("aria-valuenow", String(Math.max(1, Math.min(selected + 1, currentGroupCount))));
      root.setAttribute("aria-label", t.chart + ". " + t.instructions);
      root.setAttribute("tabindex", "0");
      if (selected >= 0) inspect(Math.min(selected, groups.length - 1));
    }

    function inspect(index) {
      if (!layout) return;
      const { groups, top, bottom, left, right, y, inspection } = layout;
      const band = groups[index];
      if (!band) return;
      selected = index;
      const mid = (y(band.upper) + y(band.lower)) / 2;
      const range = "[" + price(band.lower) + ", " + price(band.upper) + ")";
      const details = integer.format(band.shares) + (zh ? " 股" : " shares") + "  ·  " + pct(band.percent);
      root.setAttribute("aria-valuenow", String(index + 1));
      root.setAttribute("aria-valuetext", range + ", " + details);
      inspection.replaceChildren();
      inspection.append(svgNode("rect", { x: left, y: y(band.upper), width: right - left,
        height: Math.max(1, y(band.lower) - y(band.upper)), fill: "none",
        stroke: colors.highlight, "stroke-dasharray": "3 3", "stroke-width": 1 }));
      const boxWidth = Math.min(layout.width - 8, Math.max(141, (range.length + 3) * 7, details.length * 7 + 18));
      const boxX = Math.max(4, right - boxWidth - 5);
      const boxY = mid < (top + bottom) / 2 ? Math.min(mid + 15, bottom - 45) : Math.max(top, mid - 59);
      inspection.append(svgNode("rect", { x: boxX, y: boxY, width: boxWidth, height: 44, rx: 5, fill: ink }));
      label(inspection, boxX + 9, boxY + 14, range, { fill: "white", "font-weight": 650 });
      label(inspection, boxX + 9, boxY + 31, details, { fill: "#f4ded8", "font-size": 11 });
      options.onInspect?.({ ...band });
    }

    function fromPointer(event) {
      if (!layout) return;
      const rect = root.getBoundingClientRect();
      const px = (event.clientX - rect.left) * layout.width / rect.width;
      const py = (event.clientY - rect.top) * layout.height / rect.height;
      if (px < layout.left || px > layout.right || py < layout.top || py > layout.bottom) {
        if (selected !== -1) clearInspection();
        return;
      }
      const value = layout.high - (py - layout.top) / (layout.bottom - layout.top) * (layout.high - layout.low);
      const i = layout.groups.findIndex(b => value < b.upper);
      const index = i < 0 ? currentGroupCount - 1 : i;
      if (selected !== index) inspect(index);
    }

    root.addEventListener("pointermove", fromPointer);
    root.addEventListener("pointerdown", fromPointer);
    root.addEventListener("pointerleave", event => {
      if (event.pointerType !== "touch" && document.activeElement !== root) clearInspection();
    });
    root.addEventListener("focus", () => {
      if (selected < 0 && layout) {
        const i = layout.groups.findIndex(b => profile?.poc && b.lower <= profile.poc.lower && b.upper > profile.poc.lower);
        inspect(Math.max(0, i));
      }
    });
    root.addEventListener("blur", clearInspection);
    root.addEventListener("keydown", event => {
      const keys = ["ArrowUp", "ArrowRight", "ArrowDown", "ArrowLeft", "Home", "End", "Escape"];
      if (!layout || !keys.includes(event.key)) return;
      event.preventDefault();
      if (event.key === "Escape") return clearInspection();
      if (event.key === "Home") return inspect(0);
      if (event.key === "End") return inspect(currentGroupCount - 1);
      const direction = event.key === "ArrowUp" || event.key === "ArrowRight" ? 1 : -1;
      inspect(Math.max(0, Math.min(currentGroupCount - 1, selected + direction)));
    });
    draw();
    const resize = () => {
      cancelAnimationFrame(redrawFrame);
      redrawFrame = requestAnimationFrame(draw);
    };
    const observer = typeof ResizeObserver === "function" ? new ResizeObserver(resize) : null;
    observer?.observe(host);
    if (!observer) window.addEventListener("resize", resize);
    const cleanup = () => {
      observer?.disconnect();
      if (!observer) window.removeEventListener("resize", resize);
      cancelAnimationFrame(redrawFrame);
      root.remove();
      instances.delete(host);
    };
    instances.set(host, cleanup);
    return cleanup;
  }

  globalThis.ProfileChart = Object.freeze({ render });
})();
