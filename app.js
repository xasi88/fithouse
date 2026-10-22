// Логика каталога: разделы, поиск, вкусы, корзина, ссылки для менеджера, заказ в WhatsApp.
// Данные лежат в data/catalog.js (window.SHOP, window.CATS, window.CATALOG). Их собирает tools/catalog.py.

const S = window.SHOP;
const CART_KEY = "fithouseCartV1";
// Короткие имена разделов для ссылок: ?cat=protein
const SLUG = { "Протеины": "protein", "Гейнеры": "gainer", "Аминокислоты": "amino", "Креатин": "creatine",
  "Жиросжигатели": "fatburn", "Здоровье и витамины": "health", "Батончики и снеки": "bars", "Напитки": "drinks", "Аксессуары": "gear" };
const PRODUCTS = Object.fromEntries(CATALOG.map(p => [p.id, p]));
// Позиция корзины: вкус товара. VARS[id] = { p: товар, v: вкус }
const VARS = Object.fromEntries(CATALOG.flatMap(p => p.variants.map(v => [v.id, { p, v }])));

const $ = id => document.getElementById(id);
const rub = v => Math.round(v).toLocaleString("ru-RU") + " ₽";
const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
function plural(n, f) { const a = n % 100, b = n % 10; return a > 10 && a < 20 ? f[2] : b === 1 ? f[0] : b >= 2 && b <= 4 ? f[1] : f[2]; }
const flavorName = (p, v) => v.flavor || (p.variants.length > 1 ? "Без вкуса" : "");
const fullName = (p, v) => `${p.brand} ${p.name}` + (flavorName(p, v) ? `, ${flavorName(p, v)}` : "");

function priceHtml(p) {
  const ps = p.variants.map(v => v.price), lo = Math.min(...ps), hi = Math.max(...ps);
  return lo === hi ? rub(lo) : `<small>от</small> ${rub(lo)}`;
}

// ---------- Корзина: { id вкуса: количество } ----------

let cart = {};
try { cart = JSON.parse(localStorage.getItem(CART_KEY)) || {}; } catch (e) { cart = {}; }
for (const id of Object.keys(cart)) if (!VARS[id]) delete cart[id];
const saveCart = () => { try { localStorage.setItem(CART_KEY, JSON.stringify(cart)); } catch (e) {} };
const cartTotal = () => Object.entries(cart).reduce((s, [id, q]) => s + VARS[id].v.price * q, 0);
const cartCount = () => Object.values(cart).reduce((s, q) => s + q, 0);
const inCart = p => p.variants.reduce((s, v) => s + (cart[v.id] || 0), 0);

function changeQty(id, dir) {
  if (!VARS[id]) return;
  const q = (cart[id] || 0) + dir;
  if (q <= 0) delete cart[id]; else cart[id] = Math.min(q, 99);
  saveCart();
  refresh(VARS[id].p.id);
}

// ---------- Вывод ----------

let state = { cat: "all", q: "" };

function qtyHtml(id) {
  return `<div class="qty" data-id="${id}"><button data-a="-1" aria-label="Меньше">−</button><b>${cart[id]} шт</b><button data-a="1" aria-label="Больше">+</button></div>`;
}

function ctlHtml(p) {
  if (p.variants.length > 1) {
    const n = inCart(p);
    return `<button class="add${n ? " alt" : ""}" data-open="${p.id}">${n ? `В корзине: ${n} шт` : "Выбрать вкус"}</button>`;
  }
  const id = p.variants[0].id;
  return cart[id] ? qtyHtml(id) : `<button class="add" data-id="${id}" data-a="1">В корзину</button>`;
}

function cardHtml(p) {
  const n = p.variants.length;
  const meta = n > 1 ? `${n} ${plural(n, ["вкус", "вкуса", "вкусов"])}` : flavorName(p, p.variants[0]);
  return `<article class="item">
    <button class="pic" data-open="${p.id}" aria-label="Подробнее: ${esc(p.brand + " " + p.name)}">
      <img src="${p.img}" alt="${esc(p.brand + " " + p.name)}" loading="lazy" width="600" height="600">
    </button>
    <div class="body">
      <p class="brand">${esc(p.brand)}</p>
      <button class="name" data-open="${p.id}">${esc(p.name)}</button>
      <p class="meta">${esc(meta)}</p>
      <div class="price">${priceHtml(p)}</div>
      <div class="ctl" data-ctl="${p.id}">${ctlHtml(p)}</div>
    </div>
  </article>`;
}

function matches(p) {
  if (state.cat !== "all" && SLUG[p.cat] !== state.cat) return false;
  if (!state.q) return true;
  const hay = (p.brand + " " + p.name + " " + p.cat + " " + p.variants.map(v => v.flavor).join(" ")).toLowerCase().replace(/ё/g, "е");
  return state.q.toLowerCase().replace(/ё/g, "е").split(/\s+/).every(w => hay.includes(w));
}

function renderCats() {
  const count = c => CATALOG.filter(p => p.cat === c).length;
  $("cats").innerHTML = `<button data-cat="all" class="${state.cat === "all" ? "on" : ""}">Все<small>${CATALOG.length}</small></button>` +
    CATS.map(c => `<button data-cat="${SLUG[c]}" class="${state.cat === SLUG[c] ? "on" : ""}">${c}<small>${count(c)}</small></button>`).join("");
  $("cats").querySelector(".on")?.scrollIntoView({ block: "nearest", inline: "center" });
}

function renderList() {
  const found = CATALOG.filter(matches);
  if (!found.length) {
    $("list").innerHTML = `<div class="empty">Ничего не нашли. Попробуйте другое слово.</div>`;
    return;
  }
  $("list").innerHTML = CATS.map(c => {
    const items = found.filter(p => p.cat === c);
    if (!items.length) return "";
    return `<section class="sec">
      <div class="sec-head"><h2>${c}</h2><button class="link" data-share-cat="${SLUG[c]}">Ссылка на раздел</button></div>
      <div class="grid">${items.map(cardHtml).join("")}</div>
    </section>`;
  }).join("");
}

function renderCart() {
  $("lines").innerHTML = Object.keys(cart).map(id => {
    const { p, v } = VARS[id], q = cart[id];
    return `<div class="line"><img src="${v.img || p.img}" alt="">
      <div class="info"><div class="n">${esc(fullName(p, v))}</div><div class="m">${rub(v.price)} × ${q} = ${rub(v.price * q)}</div></div>
      ${qtyHtml(id)}</div>`;
  }).join("");
  $("total").textContent = rub(cartTotal());
}

function refresh(productId) {
  if (productId) document.querySelectorAll(`[data-ctl="${productId}"]`).forEach(el => (el.innerHTML = ctlHtml(PRODUCTS[productId])));
  if (openProduct) renderRows();
  const n = cartCount();
  $("bar").classList.toggle("show", n > 0);
  $("barCount").textContent = `В корзине ${n} шт`;
  $("barSum").textContent = rub(cartTotal());
  $("topCount").hidden = !n; $("topCount").textContent = n;
  if (productId) { const b = $("bar").firstElementChild; b.classList.remove("bump"); void b.offsetWidth; b.classList.add("bump"); }
  renderCart();
  if (!n) closeSheet("cart");
}

// ---------- Окна ----------

let openProduct = null;

function openSheet(id) { $(id).classList.add("show"); $(id).setAttribute("aria-hidden", "false"); document.body.classList.add("lock"); }
function closeSheet(id) {
  $(id).classList.remove("show"); $(id).setAttribute("aria-hidden", "true");
  if (id === "details") openProduct = null;
  if (!document.querySelector(".sheet.show")) document.body.classList.remove("lock");
}

function renderRows() {
  const p = openProduct;
  $("dRows").innerHTML = p.variants.map(v => `<div class="row">
      <div class="f">${esc(flavorName(p, v) || "Цена")}<small>${rub(v.price)}</small></div>
      ${cart[v.id] ? qtyHtml(v.id) : `<button class="add" data-id="${v.id}" data-a="1" data-img="${v.img}">В корзину</button>`}
    </div>`).join("");
}

function openDetails(id) {
  const p = PRODUCTS[id];
  if (!p) return;
  openProduct = p;
  $("dImg").src = p.img; $("dImg").alt = p.brand + " " + p.name;
  $("dBrand").textContent = p.brand;
  $("dName").textContent = p.name;
  renderRows();
  openSheet("details");
}

// ---------- Ссылки для менеджера ----------

const baseUrl = () => location.origin + location.pathname;

let toastTimer;
function toast(msg) {
  const t = $("toast"); t.textContent = msg; t.classList.add("show");
  clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove("show"), 2800);
}

async function copyText(text) {
  try { await navigator.clipboard.writeText(text); return true; }
  catch (e) {
    const ta = document.createElement("textarea"); ta.value = text; document.body.appendChild(ta); ta.select();
    const ok = document.execCommand("copy"); ta.remove(); return ok;
  }
}

async function share(url, title) {
  if (navigator.share && matchMedia("(pointer: coarse)").matches) {
    try { await navigator.share({ title, url }); return; } catch (e) { if (e.name === "AbortError") return; }
  }
  toast((await copyText(url)) ? "Ссылка скопирована. Вставьте её в чат с клиентом." : "Не получилось скопировать");
}

// ?cart=id.2,id.1 : корзина, которую собрал менеджер
function cartFromUrl(param) {
  const got = {};
  for (const part of param.split(",")) {
    const [id, q] = part.split(".");
    if (VARS[id]) got[id] = Math.max(1, Math.min(99, parseInt(q, 10) || 1));
  }
  if (!Object.keys(got).length) return;
  cart = got; saveCart();
  CATALOG.forEach(p => refresh(p.id));
  renderCart(); openSheet("cart");
  toast("Корзину собрал менеджер. Проверьте и отправьте заказ.");
}

// ---------- Заказ ----------

let way = "Самовывоз";

function orderText() {
  const val = id => $(id).value.trim();
  const lines = Object.entries(cart).map(([id, q], k) => {
    const { p, v } = VARS[id];
    return `${k + 1}. ${fullName(p, v)}: ${q} шт × ${rub(v.price)} = ${rub(v.price * q)}`;
  });
  let t = `Ассаламу алейкум! Хочу заказать:\n\n${lines.join("\n")}\n\nИтого: ${rub(cartTotal())}\nПолучение: ${way}`;
  if (way === "Доставка" && val("addr")) t += `\nАдрес: ${val("addr")}`;
  if (val("name")) t += `\nИмя: ${val("name")}`;
  if (val("comment")) t += `\nКомментарий: ${val("comment")}`;
  return t;
}

// ---------- События ----------

document.addEventListener("click", e => {
  const cat = e.target.closest("[data-cat]");
  if (cat) { state.cat = cat.dataset.cat; renderCats(); renderList(); return scrollTo({ top: 0 }); }

  const sc = e.target.closest("[data-share-cat]");
  if (sc) return share(`${baseUrl()}?cat=${sc.dataset.shareCat}`, "Fit House");

  const btn = e.target.closest("[data-a]");
  if (btn) {
    const id = btn.dataset.id || btn.closest("[data-id]")?.dataset.id;
    if (btn.dataset.img) $("dImg").src = btn.dataset.img;
    return changeQty(id, Number(btn.dataset.a));
  }

  const open = e.target.closest("[data-open]");
  if (open) return openDetails(open.dataset.open);

  if (e.target.closest("[data-close]")) return closeSheet(e.target.closest(".sheet").id);
  if (e.target.classList.contains("sheet")) return closeSheet(e.target.id);
});

document.addEventListener("keydown", e => {
  if (e.key === "Escape") document.querySelectorAll(".sheet.show").forEach(s => closeSheet(s.id));
});

// Поиск идёт по всему каталогу, поэтому раздел сбрасывается на «Все»
$("q").addEventListener("input", () => {
  state.q = $("q").value.trim();
  if (state.q && state.cat !== "all") { state.cat = "all"; renderCats(); }
  renderList();
});
$("openCart").onclick = $("topCart").onclick = () => {
  if (!cartCount()) return toast("Корзина пока пустая");
  renderCart(); openSheet("cart");
};
$("clear").onclick = () => { cart = {}; saveCart(); CATALOG.forEach(p => refresh(p.id)); };
$("shareCart").onclick = () => share(`${baseUrl()}?cart=${Object.entries(cart).map(([id, q]) => id + "." + q).join(",")}`, "Корзина Fit House");
$("dShare").onclick = () => openProduct && share(`${baseUrl()}?p=${openProduct.id}`, openProduct.brand + " " + openProduct.name);

$("way").onclick = e => {
  const b = e.target.closest("button"); if (!b) return;
  way = b.dataset.v;
  [...$("way").children].forEach(x => x.classList.toggle("on", x === b));
  $("addrBox").hidden = way !== "Доставка";
};

$("sendWa").onclick = () => {
  if (way === "Доставка" && !$("addr").value.trim()) { $("addr").focus(); return toast("Укажите адрес доставки"); }
  window.open(`https://wa.me/${S.orderPhone}?text=${encodeURIComponent(orderText())}`, "_blank", "noopener");
};

// ---------- Запуск ----------

if (S.demo) { $("demo").hidden = false; $("demo").textContent = `Демо-версия каталога для ${S.name}. Цены из прайса от ${S.priceDate}.`; }
$("city").textContent = S.city;
$("count").textContent = `${CATALOG.length} ${plural(CATALOG.length, ["товар", "товара", "товаров"])} в каталоге`;
$("place").textContent = `${S.name} · ${S.city}`;
$("tel").href = `tel:+${S.phone}`; $("tel").textContent = S.phoneText;
$("insta").href = `https://www.instagram.com/${S.instagram}/`; $("insta").textContent = "@" + S.instagram;
$("priceDate").textContent = `Цены из прайса от ${S.priceDate}. Наличие уточняйте у менеджера.`;

const params = new URLSearchParams(location.search);
if (Object.values(SLUG).includes(params.get("cat"))) state.cat = params.get("cat");
renderCats();
renderList();
refresh();
if (params.get("cart")) cartFromUrl(params.get("cart"));
else if (PRODUCTS[params.get("p")]) openDetails(params.get("p"));
