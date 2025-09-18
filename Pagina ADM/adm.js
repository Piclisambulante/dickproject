document.getElementById("product-form").addEventListener("submit", function(e) {
  e.preventDefault();

  const nome = document.getElementById("nome").value;
  const preco = document.getElementById("preco").value;
  const imagemInput = document.getElementById("imagem").files[0];

  const reader = new FileReader();
  reader.onload = function(event) {
    const imagemBase64 = event.target.result;

    const novoProduto = { nome, preco, imagem: imagemBase64 };

    // Recupera produtos antigos
    let produtos = JSON.parse(localStorage.getItem("produtos")) || [];
    produtos.push(novoProduto);
    localStorage.setItem("produtos", JSON.stringify(produtos));

    // Mostra na listagem local do ADM
    renderProdutos();

    // Mensagem de sucesso
    const msg = document.getElementById("msg-sucesso");
    msg.style.display = "block";
    setTimeout(() => { msg.style.display = "none"; }, 3000);

    e.target.reset();
  };

  reader.readAsDataURL(imagemInput);
});

function renderProdutos() {
  const lista = document.getElementById("produtos-lista");
  lista.innerHTML = "";
  let produtos = JSON.parse(localStorage.getItem("produtos")) || [];
  produtos.forEach((p, index) => {
    const div = document.createElement("div");
    div.classList.add("produto");
    div.innerHTML = `
      <img src="${p.imagem}" alt="${p.nome}">
      <h3>${p.nome}</h3>
      <p>R$ ${p.preco}</p>
      <small>${p.categoria}</small>
      <button class="btn-excluir" data-index="${index}">Excluir</button>
    `;
    lista.appendChild(div);
  });

  // Adiciona eventos de exclusão aos botões
  document.querySelectorAll(".btn-excluir").forEach(button => {
    button.addEventListener("click", function() {
      const index = this.getAttribute("data-index");
      excluirProduto(index);
    });
  });
}

function excluirProduto(index) {
  let produtos = JSON.parse(localStorage.getItem("produtos")) || [];
  produtos.splice(index, 1); // Remove o produto da lista
  localStorage.setItem("produtos", JSON.stringify(produtos));

  // Atualiza a lista exibida
  renderProdutos();
}

// Inicializa a lista de produtos ao carregar a página
renderProdutos();

