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

// Calcula a origem do pop (transform-origin) baseada no clique/card
function setModalOriginFrom(el, evt) {
  try {
    const rect = el.getBoundingClientRect();
    const cx = evt ? evt.clientX : rect.left + rect.width / 2;
    const cy = evt ? evt.clientY : rect.top + rect.height / 2;
    const vw = Math.max(document.documentElement.clientWidth, window.innerWidth || 0);
    const vh = Math.max(document.documentElement.clientHeight, window.innerHeight || 0);
    document.documentElement.style.setProperty('--mx', Math.min(Math.max(cx / vw * 100, 0), 100).toFixed(2) + '%');
    document.documentElement.style.setProperty('--my', Math.min(Math.max(cy / vh * 100, 0), 100).toFixed(2) + '%');
  } catch (e) {}
}

// Força o reflow para animação
const forceReflow = (el) => { void el.offsetWidth; };

function openModal(img, title, priceLabel, originEl = null, evt = null) {
  modalImg.src = img;
  modalImg.alt = title;
  modalTitle.textContent = title;
  modalPrice.textContent = priceLabel;
  modalQty.value = 1;

  if (originEl) setModalOriginFrom(originEl, evt);

  // Limpa estados e mostra overlay
  modal.classList.remove('is-closing', 'is-opening');
  modal.classList.add('open');
  document.body.classList.add('noscroll');

  const card = modal.querySelector('.modal-card');

  // Aciona animação
  forceReflow(card);
  modal.classList.add('is-opening');

  const done = () => modal.classList.remove('is-opening');
  const t = setTimeout(done, 600);
  card.addEventListener('animationend', (e) => {
    if (e.target === card) {
      clearTimeout(t);
      done();
    }
  }, { once: true });
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
  card.addEventListener('animationend', (e) => {
    if (e.target === card) {
      clearTimeout(t);
      finish();
    }
  }, { once: true });
}

// Ações de clique para fechar o modal
closeBtn?.addEventListener('click', closeModal);
modal?.addEventListener('click', (e) => {
  if (e.target === modal) closeModal();
});
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') closeModal();
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

document.addEventListener('DOMContentLoaded', function () {

  // Seleção dos elementos
  const loginBtn = document.getElementById('loginBtn');
  const loginModal = document.getElementById('loginModal');
  const closeModalBtn = document.getElementById('closeModal');
  const profileCard = document.getElementById('profileCard');
  const loginButton = document.getElementById('loginButton');
  const logoutBtn = document.getElementById('logoutBtn');
  const userName = document.getElementById('userName');
  const userEmail = document.getElementById('userEmail');

  // Exibir o modal de login
  loginBtn.addEventListener('click', function () {
    loginModal.style.display = 'block';
    profileCard.style.display = 'none';  // Esconde o perfil enquanto o login está aberto
    loginButton.style.display = 'none';  // Esconde o botão de login
  });

  // Fechar o modal de login ao clicar no 'x'
  closeModalBtn.addEventListener('click', function () {
    loginModal.style.display = 'none';
    profileCard.style.display = 'block';  // Exibe o perfil novamente
    loginButton.style.display = 'none';  // Esconde o botão de login
  });

  // Função para simular o login
  const loginForm = document.getElementById('loginForm');
  loginForm.addEventListener('submit', function (e) {
    e.preventDefault();

    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;

    if (email && password) {
      // Simula login (você pode substituir com autenticação real)
      console.log('Login realizado com sucesso!');

      // Atualiza as informações do perfil com os dados de login
      userName.innerText = 'Usuário';  // Altere conforme o nome do usuário real
      userEmail.innerText = email;  // Altere para o e-mail fornecido durante o login

      // Fecha o modal de login
      loginModal.style.display = 'none';

      // Exibe o perfil e o botão de logout
      profileCard.style.display = 'block';
      loginButton.style.display = 'none';  // Esconde o botão de login quando já estiver logado
    } else {
      alert('Por favor, preencha todos os campos!');
    }
  });

  // Função de Logout
  logoutBtn.addEventListener('click', function () {
    // Simula logout (aqui você pode adicionar a lógica real de logout)
    console.log('Logout realizado!');

    // Esconde o perfil e exibe o botão de login
    profileCard.style.display = 'none';
    loginButton.style.display = 'block';  // Exibe o botão de login novamente

    // Limpar os dados do usuário
    userName.innerText = '';
    userEmail.innerText = '';
  });
    

});
// Acessar os elementos
const showCreateAccount = document.getElementById('showCreateAccount');
const showLogin = document.getElementById('showLogin');
const loginForm = document.getElementById('loginForm');
const createAccountForm = document.getElementById('createAccountForm');

// Mostrar o formulário de criar conta
showCreateAccount.addEventListener('click', () => {
  loginForm.style.display = 'none';
  createAccountForm.style.display = 'block';
  document.querySelector('h2').textContent = 'Criar Conta';  // Atualizar título do modal
});

// Mostrar o formulário de login
showLogin.addEventListener('click', () => {
  createAccountForm.style.display = 'none';
  loginForm.style.display = 'block';
  document.querySelector('h2').textContent = 'Entrar';  // Atualizar título do modal
});

// Fechar o modal
const closeModal = document.getElementById('closeModal');
closeModal.addEventListener('click', () => {
  document.getElementById('loginModal').classList.remove('show');
});
