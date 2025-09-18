/* =========================
   Helpers
========================= */
function parseBRL(str) {
  return Number(String(str)
    .replace(/[^\d,.-]/g, '')
    .replace(/\./g, '')
    .replace(',', '.')) || 0;
}
function formatBRL(n) {
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

/* =========================
   Drawer (menu lateral)
========================= */
(function ensureDrawer() {
  if (document.getElementById('nav-overlay')) return;

  const overlay = document.createElement('div');
  overlay.id = 'nav-overlay';
  overlay.innerHTML = `
    <aside class="nav-panel" role="dialog" aria-modal="true" aria-label="Menu">
      <div class="nav-panel-header">
        <h2>Menu</h2>
        <button class="nav-close" type="button" aria-label="Fechar">×</button>
      </div>
      <ul class="nav-list">
        <li><a href="#">Cardápio</a></li>
        <li><a href="#">Perguntas frequentes</a></li>
        <li><a href="#">Sobre nós</a></li>
        <li><a href="carrinho.html">Pedidos</a></li>
        <li><a href="#">Histórico de compras</a></li>
        <li><a href="#">Minha conta</a></li>
      </ul>
      <div class="nav-panel-brand">
        <img src="img/logo.webp" alt="L'Azur">
      </div>
    </aside>
  `;
  document.body.appendChild(overlay);
})();



const drawer = {
  overlay: document.getElementById('nav-overlay'),
  open() {
    this.overlay.classList.add('open');
    document.body.classList.add('noscroll');
    this.overlay.setAttribute('aria-hidden', 'false');
  },
  close() {
    this.overlay.classList.remove('open');
    document.body.classList.remove('noscroll');
    this.overlay.setAttribute('aria-hidden', 'true');
  }
};

const menuBtn = document.querySelector('.menu-btn');
if (menuBtn) menuBtn.addEventListener('click', () => drawer.open());

document.addEventListener('click', (e) => {
  if (e.target.closest('.nav-close')) drawer.close();
});
drawer.overlay?.addEventListener('click', (e) => {
  if (e.target.id === 'nav-overlay') drawer.close();
});
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && drawer.overlay?.classList.contains('open')) {
    drawer.close();
  }
});

/* =========================
   Modal do Produto
========================= */
const modal      = document.getElementById('product-modal');
const modalImg   = document.getElementById('modal-img');
const modalTitle = document.getElementById('modal-title');
const modalPrice = document.getElementById('modal-price');
const modalQty   = document.getElementById('modal-qty');
const addBtn     = document.getElementById('add-to-cart');
const closeBtn   = document.querySelector('.modal-close');

// calcula origem do pop (transform-origin) baseada no clique/card
function setModalOriginFrom(el, evt){
  try{
    const rect = el.getBoundingClientRect();
    const cx = evt ? evt.clientX : rect.left + rect.width/2;
    const cy = evt ? evt.clientY : rect.top  + rect.height/2;
    const vw = Math.max(document.documentElement.clientWidth, window.innerWidth || 0);
    const vh = Math.max(document.documentElement.clientHeight, window.innerHeight || 0);
    document.documentElement.style.setProperty('--mx', Math.min(Math.max(cx / vw * 100, 0), 100).toFixed(2) + '%');
    document.documentElement.style.setProperty('--my', Math.min(Math.max(cy / vh * 100, 0), 100).toFixed(2) + '%');
  }catch(e){}
}

// força reflow
const forceReflow = (el) => { void el.offsetWidth; };

function openModal(img, title, priceLabel, originEl=null, evt=null) {
  modalImg.src = img;
  modalImg.alt = title;
  modalTitle.textContent = title;
  modalPrice.textContent = priceLabel;
  modalQty.value = 1;

  if (originEl) setModalOriginFrom(originEl, evt);

  // limpa estados e mostra overlay
  modal.classList.remove('is-closing', 'is-opening');
  modal.classList.add('open');
  document.body.classList.add('noscroll');

  const card = modal.querySelector('.modal-card');

  // reflow + aciona animação
  forceReflow(card);
  modal.classList.add('is-opening');

  // fallback se animationend não vier
  const done = () => modal.classList.remove('is-opening');
  const t = setTimeout(done, 600);
  card.addEventListener('animationend', (e) => { if (e.target === card){ clearTimeout(t); done(); } }, { once:true });
}

function closeModal() {
  if (!modal.classList.contains('open')) return;

  modal.classList.remove('is-opening');
  modal.classList.add('is-closing');

  const card = modal.querySelector('.modal-card');
  forceReflow(card);

  const finish = () => {
    modal.classList.remove('open', 'is-closing');
    document.body.classList.remove('noscroll');
  };
  const t = setTimeout(finish, 450);
  card.addEventListener('animationend', (e) => { if (e.target === card){ clearTimeout(t); finish(); } }, { once:true });
}

// saídas garantidas
closeBtn?.addEventListener('click', closeModal);
modal?.addEventListener('click', (e) => { if (e.target === modal) closeModal(); });
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeModal(); });

/* quantidade na pílula */
document.querySelectorAll('.qty-btn').forEach((btn) => {
  btn.addEventListener('click', () => {
    const dir = btn.dataset.op;
    const cur = parseInt(modalQty.value || '1', 10);
    modalQty.value = dir === 'inc' ? (cur + 1) : Math.max(1, cur - 1);
  });
});

/* =========================
   Carrinho (localStorage)
========================= */
function getCart() {
  return JSON.parse(localStorage.getItem('cart') || '[]');
}
function setCart(c) {
  localStorage.setItem('cart', JSON.stringify(c));
}
function addToCart({ title, flavor = '', img, priceNumber, qty = 1 }) {
  const cart = getCart();
  const i = cart.findIndex(p => p.title === title && (p.flavor || '') === (flavor || ''));
  if (i >= 0) {
    cart[i].qty += qty;
  } else {
    cart.push({ title, flavor, img, price: Number(priceNumber), qty: Number(qty) });
  }
  setCart(cart);
}

/* salvar do modal fecha também */
addBtn?.addEventListener('click', () => {
  const title = modalTitle.textContent.trim();
  const priceNumber = parseBRL(modalPrice.textContent);
  const img = modalImg.src;
  const qty = Math.max(1, parseInt(modalQty.value || '1', 10));

  addToCart({ title, img, priceNumber, qty });
  closeModal();
});

/* =========================
   Abrir modal a partir dos cards (com origem do clique)
========================= */
const imperdiveisCards = document.querySelectorAll('.imperdiveis .card');
const sugestoesCards   = document.querySelectorAll('.sugestoes .carousel-item');

function extractFromCard(card) {
  const img = card.querySelector('img')?.src || '';
  let title = '';
  let priceLabel = '';

  if (card.classList.contains('card')) {
    title = card.querySelector('h3')?.textContent.trim() || '';
    priceLabel = card.querySelector('.card-text p')?.textContent.trim() ||
                 card.querySelector('p')?.textContent.trim() || '';
  } else if (card.classList.contains('carousel-item')) {
    const ps = card.querySelectorAll('p');
    title = ps[0]?.textContent.trim() || '';
    priceLabel = ps[1]?.textContent.trim() || '';
  } else {
    const ps = card.querySelectorAll('p');
    title = card.querySelector('h3')?.textContent.trim() || ps[0]?.textContent.trim() || '';
    priceLabel = (ps.length > 1 ? ps[1] : ps[0])?.textContent.trim() || '';
  }
  return { img, title, priceLabel };
}

imperdiveisCards.forEach(card => {
  card.addEventListener('click', (e) => {
    const { img, title, priceLabel } = extractFromCard(card);
    openModal(img, title, priceLabel, card, e); // origem do pop = card clicado
  });
});
sugestoesCards.forEach(card => {
  card.addEventListener('click', (e) => {
    const { img, title, priceLabel } = extractFromCard(card);
    openModal(img, title, priceLabel, card, e); // origem do pop = card clicado
  });
});

/* =========================
   Ripple effect
========================= */
function attachRipple(el) {
  const computed = getComputedStyle(el);
  if (computed.position === 'static') el.style.position = 'relative';
  el.style.overflow = 'hidden';
  el.addEventListener('click', function (e) {
    const r = document.createElement('span');
    const rect = this.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height);
    r.style.width = r.style.height = size + 'px';
    r.style.position = 'absolute';
    r.style.borderRadius = '50%';
    r.style.left = (e.clientX - rect.left - size / 2) + 'px';
    r.style.top  = (e.clientY - rect.top  - size / 2) + 'px';
    r.style.background = 'rgba(224, 177, 92, 0.25)';
    r.style.transform = 'scale(0)';
    r.style.animation = 'ripple .6s ease-out forwards';
    this.appendChild(r);
    r.addEventListener('animationend', () => r.remove());
  });
}
document.querySelectorAll('.menu-btn, .cart-btn, .add-btn, .nav-list a, .qty-btn').forEach(attachRipple);

(function ensureRippleKeyframes() {
  const id = 'ripple-keyframes-style';
  if (document.getElementById(id)) return;
  const style = document.createElement('style');
  style.id = id;
  style.textContent = `
    @keyframes ripple {
      to { transform: scale(2.4); opacity: 0; }
    }
  `;
  document.head.appendChild(style);
})();
// Obtém o link de "Sobre nós" e o conteúdo de texto
const sobreLink = document.getElementById('sobre-link');
const sobreText = document.getElementById('sobre-text');
const menuCloseBtn = document.querySelector('.nav-close'); // Botão de fechar o menu
const navOverlay = document.getElementById('nav-overlay'); // Overlay que indica que o menu está aberto

// Adiciona um evento de clique ao link "Sobre nós" para exibir/ocultar o texto
sobreLink.addEventListener('click', (event) => {
  event.preventDefault();  // Impede o link de redirecionar
  sobreText.classList.toggle('active');  // Alterna a visibilidade do texto
});

// Função para fechar o texto quando o menu for fechado
menuCloseBtn.addEventListener('click', () => {
  sobreText.classList.remove('active');  // Remove a classe 'active' para ocultar o texto
  navOverlay.classList.remove('open'); // Fecha o menu (oculta o overlay)
});

// Função para abrir o menu (quando o botão ☰ for clicado)
document.querySelector('.menu-btn').addEventListener('click', () => {
  navOverlay.classList.add('open');  // Exibe o menu (adiciona o overlay)
});
