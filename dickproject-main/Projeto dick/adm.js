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
        <li><a href="cardapio.html">Cardápio</a></li>
        <li><a href="#">Perguntas frequentes</a></li>
        <li><a href="#">Sobre nós</a></li>
        <li><a href="carrinho.html">Pedidos</a></li>
        <li><a href="#">Histórico de compras</a></li>
        <li><a href="conta.html">Minha conta</a></li>
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
   Produtos (LocalStorage)
========================= */
const form = document.getElementById("product-form");
if (form) {
  form.addEventListener("submit", function(e) {
    e.preventDefault();

    const nome = document.getElementById("nome").value.trim();
    const preco = document.getElementById("preco").value.trim();
    const imagemInput = document.getElementById("imagem").files[0];

    if (!nome || !preco || !imagemInput) return;

    const reader = new FileReader();
    reader.onload = function(event) {
      const imagemBase64 = event.target.result;

      const novoProduto = { 
        nome, 
        preco: formatBRL(preco), // já formata o preço
        imagem: imagemBase64 
      };

      // Recupera produtos antigos
      let produtos = JSON.parse(localStorage.getItem("produtos")) || [];
      produtos.push(novoProduto);
      localStorage.setItem("produtos", JSON.stringify(produtos));

      // Atualiza listagem no ADM
      renderProdutos();

      // Mensagem de sucesso
      const msg = document.getElementById("msg-sucesso");
      msg.style.display = "block";
      setTimeout(() => { msg.style.display = "none"; }, 3000);

      form.reset();
    };

    reader.readAsDataURL(imagemInput);
  });
}

function renderProdutos() {
  const lista = document.getElementById("produtos-lista");
  if (!lista) return;

  lista.innerHTML = "";
  let produtos = JSON.parse(localStorage.getItem("produtos")) || [];

  produtos.forEach((p, index) => {
    const div = document.createElement("div");
    div.classList.add("produto");
    div.innerHTML = `
      <img src="${p.imagem}" alt="${p.nome}">
      <h3>${p.nome}</h3>
      <p class="preco">R$ ${p.preco}</p>
      </br>
      <button class="btn-excluir" data-index="${index}">Excluir</button>
    `;
    lista.appendChild(div);
  });

  // Eventos de exclusão
  document.querySelectorAll(".btn-excluir").forEach(button => {
    button.addEventListener("click", function() {
      const index = this.getAttribute("data-index");
      excluirProduto(index);
    });
  });
}

function excluirProduto(index) {
  let produtos = JSON.parse(localStorage.getItem("produtos")) || [];
  produtos.splice(index, 1);
  localStorage.setItem("produtos", JSON.stringify(produtos));
  renderProdutos();
}

// Inicializa lista se for ADM
renderProdutos();
