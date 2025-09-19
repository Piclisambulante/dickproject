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
   Modal do Produto
========================= */
const modal = document.getElementById('product-modal');
const modalImg = document.getElementById('modal-img');
const modalTitle = document.getElementById('modal-title');
const modalPrice = document.getElementById('modal-price');
const modalQty = document.getElementById('modal-qty');
const addBtn = document.getElementById('add-to-cart');
const closeBtn = document.querySelector('.modal-close');

// Força o reflow
const forceReflow = (el) => { void el.offsetWidth; };

function openModal(img, title, priceLabel, originEl = null, evt = null) {
  modalImg.src = img;
  modalImg.alt = title;
  modalTitle.textContent = title;
  modalPrice.textContent = priceLabel;
  modalQty.value = 1;

  // limpa estados e mostra overlay
  modal.classList.remove('is-closing', 'is-opening');
  modal.classList.add('open');
  document.body.classList.add('noscroll');

  const card = modal.querySelector('.modal-card');

  // Reflow + aciona animação
  forceReflow(card);
  modal.classList.add('is-opening');

  const done = () => modal.classList.remove('is-opening');
  const t = setTimeout(done, 600);
  card.addEventListener('animationend', (e) => { if (e.target === card) { clearTimeout(t); done(); } }, { once: true });
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
  card.addEventListener('animationend', (e) => { if (e.target === card) { clearTimeout(t); finish(); } }, { once: true });
}

// Ações do botão fechar modal
closeBtn?.addEventListener('click', closeModal);
modal?.addEventListener('click', (e) => { if (e.target === modal) closeModal(); });
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeModal(); });

/* =========================
   Exibição de Produtos (Cardápio)
========================= */
document.addEventListener('DOMContentLoaded', function () {
  renderProdutos(); // Chama a função para renderizar os produtos
});

function renderProdutos() {
  const lista = document.getElementById("produtos-lista");
  if (!lista) return;

  lista.innerHTML = ""; // Limpa qualquer conteúdo anterior na lista
  let produtos = JSON.parse(localStorage.getItem("produtos")) || [];

  // Se não houver produtos, mostra uma mensagem
  if (produtos.length === 0) {
    lista.innerHTML = "<p>Nenhum produto disponível.</p>";
    return;
  }

  // Adiciona cada produto à lista
  produtos.forEach((p) => {
    const div = document.createElement("div");
    div.classList.add("produto"); // Aplica a classe 'produto' para estilizar
    div.innerHTML = `
      <img src="${p.imagem}" alt="${p.nome}">
      <h3>${p.nome}</h3>
      <p>${p.preco}</p>
    `;
    lista.appendChild(div); // Adiciona o item à lista

    // Adicionando o evento de clique para abrir o modal
    div.addEventListener('click', () => {
      openModal(p.imagem, p.nome, p.preco, div);
    });
  });
}

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

// Ações do botão adicionar ao carrinho
addBtn?.addEventListener('click', () => {
  const title = modalTitle.textContent.trim();
  const priceNumber = parseBRL(modalPrice.textContent);
  const img = modalImg.src;
  const qty = Math.max(1, parseInt(modalQty.value || '1', 10));

  addToCart({ title, img, priceNumber, qty });
  closeModal(); // Fecha o modal após adicionar ao carrinho
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
    r.style.top = (e.clientY - rect.top - size / 2) + 'px';
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

/* =========================
   Exibição de Produtos (Cardápio)
========================= */
document.addEventListener('DOMContentLoaded', function() {
  renderProdutos(); // Chama a função para renderizar os produtos
});

function renderProdutos() {
  const lista = document.getElementById("produtos-lista");
  if (!lista) return;

  lista.innerHTML = "";
  let produtos = JSON.parse(localStorage.getItem("produtos")) || [];

  produtos.forEach((p) => {
    const div = document.createElement("div");
    div.classList.add("produto");
    div.innerHTML = `
      <img src="${p.imagem}" alt="${p.nome}">
      <h3>${p.nome}</h3>
      <p>${p.preco}</p>
    `;
    lista.appendChild(div);
  });
}

document.addEventListener('DOMContentLoaded', function() {
  renderProdutos(); // Chama a função para renderizar os produtos
});

function renderProdutos() {
  const lista = document.getElementById("produtos-lista");
  if (!lista) return;

  lista.innerHTML = "";
  let produtos = JSON.parse(localStorage.getItem("produtos")) || [];

  if (produtos.length === 0) {
    lista.innerHTML = "<p>Nenhum produto disponível.</p>";
    return;
  }

  produtos.forEach((p) => {
    const div = document.createElement("div");
    div.classList.add("produto");
    div.innerHTML = `
      <img src="${p.imagem}" alt="${p.nome}">
      <h3>${p.nome}</h3>
      <p>${p.preco}</p>
    `;
    lista.appendChild(div);
  });
}

// Função que será chamada para renderizar os produtos
function renderProdutos() {
  const lista = document.getElementById("produtos-lista");
  if (!lista) return;

  // Limpar qualquer conteúdo existente
  lista.innerHTML = "";

  // Carregar os produtos do localStorage ou de onde os produtos estão armazenados
  let produtos = JSON.parse(localStorage.getItem("produtos")) || [];

  // Verifica se há produtos para exibir
  if (produtos.length === 0) {
    lista.innerHTML = "<p>Nenhum produto disponível.</p>";
    return;
  }

  // Criando a grid e inserindo os produtos
  const gridCardapio = document.createElement("div");
  gridCardapio.classList.add("grid-cardapio"); // Adiciona a classe da grid

  // Loop para criar os cards
  produtos.forEach((p) => {
    const produtoDiv = document.createElement("div");
    produtoDiv.classList.add("produto");  // Adiciona a classe para o produto
    produtoDiv.innerHTML = `
      <img src="${p.imagem}" alt="${p.nome}">
      <h3>${p.nome}</h3>
      <span>R$ ${p.preco}</span>
    `;

    gridCardapio.appendChild(produtoDiv);  // Adiciona o produto à grid
  });

  lista.appendChild(gridCardapio);  // Adiciona a grid com os produtos no container
}

// Chama a função quando o conteúdo da página é carregado
document.addEventListener("DOMContentLoaded", function () {
  renderProdutos();  // Renderiza os produtos dinamicamente
});


