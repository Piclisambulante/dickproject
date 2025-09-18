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
  const sucessoBalão = document.getElementById('sucessoBalão');  // Elemento do balão de sucesso
  const logoutBalão = document.getElementById('logoutBalão');    // Elemento do balão de logout
  const erroBalão = document.getElementById('erroBalão');        // Elemento do balão de erro
  const confirmLogoutModal = document.getElementById('confirmLogoutModal');  // Modal de confirmação de logout
  const closeLogoutModalBtn = document.getElementById('closeLogoutModal');    // Botão de fechar o modal de logout
  const confirmLogoutBtn = document.getElementById('confirmLogoutBtn');      // Botão de confirmar logout
  const cancelLogoutBtn = document.getElementById('cancelLogoutBtn');        // Botão de cancelar logout

  // Função para exibir o balão de sucesso ou erro
  function mostrarBalão(mensagem, balão) {
    balão.textContent = mensagem;
    balão.style.display = 'block'; // Mostrar o balão
    setTimeout(() => {
      balão.style.display = 'none'; // Esconder o balão após a animação
    }, 5000); // O balão desaparece após 5 segundos
  }

  // Verificar se o usuário já está logado no localStorage
  const storedLoginStatus = localStorage.getItem('loggedIn');

  // Se estiver logado, exibe as informações do usuário
  if (storedLoginStatus === 'true') {
    const storedUser = localStorage.getItem('user');
    const user = JSON.parse(storedUser);

    document.getElementById('userName').innerText = user.name;
    document.getElementById('userEmail').innerText = user.email;
    document.getElementById('userAvatar').src = user.profilePicture || 'img/user.jpg';
    document.getElementById('loginButton').style.display = 'none';
    document.getElementById('profileCard').style.display = 'block';

    // Exibir balão de login bem-sucedido
    mostrarBalão('Login bem-sucedido!', sucessoBalão);
  } else {
    document.getElementById('loginButton').style.display = 'block';
    document.getElementById('profileCard').style.display = 'none';
  }

  // Elementos de interação
  const loginBtn = document.getElementById('loginBtn');
  const logoutBtn = document.getElementById('logoutBtn');
  const profileCard = document.getElementById('profileCard');
  const loginButton = document.getElementById('loginButton');
  const formLogin = document.getElementById('formLogin');
  const loginModal = document.getElementById('loginModal');
  const closeModalBtn = document.getElementById('closeModal');
  const profileUpload = document.getElementById('profileUpload');
  const userName = document.getElementById('userName');
  const userEmail = document.getElementById('userEmail');
  const userAvatar = document.getElementById('userAvatar');

  // Abrir o modal de login
  loginBtn.addEventListener('click', function () {
    loginModal.classList.add('show');
    profileCard.style.display = 'none';
    loginButton.style.display = 'none';
  });

  // Fechar o modal de login
  closeModalBtn.addEventListener('click', function () {
    loginModal.classList.remove('show');
    profileCard.style.display = 'none';
    loginButton.style.display = 'block';
  });

  // Alternar para o formulário de criar conta
  document.getElementById('showCreateAccount').addEventListener('click', function () {
    document.getElementById('loginForm').style.display = 'none';
    document.getElementById('createAccountForm').style.display = 'block';
  });

  // Alternar para o formulário de login
  document.getElementById('showLogin').addEventListener('click', function () {
    document.getElementById('createAccountForm').style.display = 'none';
    document.getElementById('loginForm').style.display = 'block';
  });

  // Função para login (validando e-mail e senha)
  formLogin.addEventListener('submit', function (e) {
    e.preventDefault();

    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;

    const storedUser = localStorage.getItem('user');
    const user = JSON.parse(storedUser);

    if (user && user.email === email && user.password === password) {
      // Atualiza as informações do perfil
      userName.innerText = user.name;
      userEmail.innerText = user.email;
      userAvatar.src = user.profilePicture || 'img/user.jpg';

      // Salva os dados no localStorage
      localStorage.setItem('loggedIn', 'true');
      loginModal.classList.remove('show');
      profileCard.style.display = 'block';
      loginButton.style.display = 'none';

      // Exibir balão de login bem-sucedido
      mostrarBalão('Login bem-sucedido!', sucessoBalão);
    } else {
      // Exibir balão de erro se e-mail ou senha estiverem incorretos
      mostrarBalão('E-mail ou senha inválidos!', erroBalão);
    }
  });

  // Função para criar conta
  document.getElementById('formCreateAccount').addEventListener('submit', function (e) {
    e.preventDefault();

    const name = document.getElementById('newName').value;
    const email = document.getElementById('newEmail').value;
    const password = document.getElementById('newPassword').value;

    // Salva as informações do usuário no localStorage
    const newUser = { name, email, password, profilePicture: '' };
    localStorage.setItem('user', JSON.stringify(newUser));

    // Exibir balão de sucesso
    mostrarBalão('Conta criada com sucesso!', sucessoBalão);

    // Volta para o formulário de login
    document.getElementById('createAccountForm').style.display = 'none';
    document.getElementById('loginForm').style.display = 'block';
  });

  // Função para logout (exibir modal de confirmação)
  logoutBtn.addEventListener('click', function () {
    confirmLogoutModal.classList.add('show'); // Exibe o modal de confirmação
  });

  // Fechar o modal de logout
  closeLogoutModalBtn.addEventListener('click', function () {
    confirmLogoutModal.classList.remove('show'); // Fecha o modal de confirmação
  });

  // Confirmar o logout
  confirmLogoutBtn.addEventListener('click', function () {
    console.log('Logout realizado!');

    // Limpa os dados do perfil
    userName.innerText = '';
    userEmail.innerText = '';
    userAvatar.src = 'img/user.jpg';

    // Remove os dados do localStorage e marca o status como "não logado"
    localStorage.removeItem('user');
    localStorage.setItem('loggedIn', 'false');

    // Exibe o botão de login novamente
    loginButton.style.display = 'block';
    profileCard.style.display = 'none';

    // Exibir balão de logout
    mostrarBalão('Você saiu da sua conta!', logoutBalão);

    // Fechar o modal após a confirmação
    confirmLogoutModal.classList.remove('show');
  });

  // Cancelar o logout
  cancelLogoutBtn.addEventListener('click', function () {
    confirmLogoutModal.classList.remove('show'); // Fecha o modal sem logout
  });

  // Função para editar a foto de perfil
  profileUpload.addEventListener('change', function (e) {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = function (e) {
        userAvatar.src = e.target.result; // Atualiza a foto do perfil
        const user = JSON.parse(localStorage.getItem('user'));
        user.profilePicture = e.target.result;
        localStorage.setItem('user', JSON.stringify(user));
      };
      reader.readAsDataURL(file); // Lê o arquivo como URL
    }
  });
});
