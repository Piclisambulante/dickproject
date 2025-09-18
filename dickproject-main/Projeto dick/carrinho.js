/* ============ Helpers BRL ============ */
function parseBRL(str){
  return Number(String(str).replace(/[^\d,.-]/g,'').replace(/\./g,'').replace(',', '.')) || 0;
}
function formatBRL(n){
  return n.toLocaleString('pt-BR', { style:'currency', currency:'BRL' });
}

/* ============ LocalStorage Cart ============ */
function getCart(){
  // Sanitize itens antigos (price string -> número)
  const cart = JSON.parse(localStorage.getItem('cart') || '[]');
  cart.forEach(it=>{
    if(typeof it.price !== 'number' || isNaN(it.price)) it.price = parseBRL(it.price);
    if(!it.qty || isNaN(it.qty)) it.qty = 1;
  });
  localStorage.setItem('cart', JSON.stringify(cart));
  return cart;
}
function setCart(cart){ localStorage.setItem('cart', JSON.stringify(cart)); }

/* ============ Montagem do carrinho (linhas) ============ */
function renderCart(){
  const tbody = document.querySelector('.cart-items tbody');
  tbody.innerHTML = '';
  const cart = getCart();

  if(!cart.length){
    tbody.innerHTML = `<tr id="cart-empty-row"><td colspan="3" style="text-align:center; padding:18px 8px; color:#666;">
      Seu carrinho está vazio.
    </td></tr>`;
    updateSummary();
    return;
  }

  cart.forEach(item=>{
    const tr = document.createElement('tr');
    tr.className = 'item-row';
    tr.dataset.title     = item.title;
    tr.dataset.flavor    = item.flavor ?? '';
    tr.dataset.unitPrice = String(item.price); // unitário numérico

    tr.innerHTML = `
      <td>
        <div class="product-info">
          <img src="${item.img}" alt="${item.title} ${item.flavor||''}">
          <div class="product-text">
            <span class="product-name">${item.title}</span>
            ${item.flavor ? `<span class="product-flavor">${item.flavor}</span>` : ''}
          </div>
        </div>
      </td>
      <td style="text-align:center;">
        <div class="qty" role="group" aria-label="Quantidade ${item.title}">
          <button class="qty-btn" type="button" data-op="dec" aria-label="Diminuir">−</button>
          <input class="qty-input" type="number" value="${item.qty}" min="1" inputmode="numeric" aria-label="Quantidade">
          <button class="qty-btn" type="button" data-op="inc" aria-label="Aumentar">+</button>
        </div>
      </td>
      <td style="text-align:right;" class="line-total">${formatBRL(item.price * item.qty)}</td>
    `;
    tbody.appendChild(tr);
  });

  initQtyHandlers();   // ativa a delegação (uma vez)
  updateSummary();
}

/* ============ Modal remover item ============ */
function ensureRemoveModal(){
  if (document.getElementById('remove-confirm-overlay')) return;
  const overlay = document.createElement('div');
  overlay.id = 'remove-confirm-overlay';
  overlay.innerHTML = `
    <div class="remove-dialog" role="dialog" aria-modal="true" aria-labelledby="rem-title">
      <p id="rem-title">Tem certeza que deseja remover este produto?</p>
      <div class="remove-actions">
        <button type="button" class="btn-remove" id="btn-confirm-remove">Remover</button>
        <button type="button" class="btn-cancel" id="btn-cancel-remove">cancelar</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);
}
function openRemoveConfirm(onConfirm, onCancel){
  ensureRemoveModal();
  const overlay = document.getElementById('remove-confirm-overlay');
  overlay.classList.add('open');

  const confirmBtn = overlay.querySelector('#btn-confirm-remove');
  const cancelBtn  = overlay.querySelector('#btn-cancel-remove');

  const close = (didConfirm=false)=>{
    overlay.classList.remove('open');
    document.removeEventListener('keydown', escHandler);
    overlay.removeEventListener('click', outsideHandler);
    confirmBtn.onclick = cancelBtn.onclick = null;
    didConfirm ? onConfirm?.() : onCancel?.();
  };
  const escHandler     = e => { if(e.key === 'Escape') close(false); };
  const outsideHandler = e => { if(e.target.id === 'remove-confirm-overlay') close(false); };

  confirmBtn.onclick = () => close(true);
  cancelBtn.onclick  = () => close(false);
  document.addEventListener('keydown', escHandler);
  overlay.addEventListener('click', outsideHandler);
}

/* ============ Atualizações e resumo ============ */
function findCartIndexByRow(tr){
  const title  = tr.dataset.title || '';
  const flavor = tr.dataset.flavor || '';
  const cart = getCart();
  return { cart, index: cart.findIndex(i => i.title === title && (i.flavor||'') === flavor) };
}

function handleQtyChange(tr, newQty){
  const qtyInput = tr.querySelector('.qty-input');
  const totalTd  = tr.querySelector('.line-total');
  const unit     = Number(tr.dataset.unitPrice) || 0;
  const q        = Math.max(1, parseInt(newQty || '1', 10));

  qtyInput.value       = q;
  totalTd.textContent  = formatBRL(unit * q);

  const { cart, index } = findCartIndexByRow(tr);
  if(index >= 0){
    cart[index].qty = q;
    setCart(cart);
  }
  updateSummary();
}

function removeRowAndPersist(tr){
  const { cart, index } = findCartIndexByRow(tr);
  if(index >= 0){
    cart.splice(index, 1);
    setCart(cart);
  }
  tr.remove();
  updateSummary();

  if(!document.querySelector('.cart-items tbody tr.item-row')){
    const tbody = document.querySelector('.cart-items tbody');
    tbody.innerHTML = `<tr id="cart-empty-row"><td colspan="3" style="text-align:center; padding:18px 8px; color:#666;">
      Seu carrinho está vazio.
    </td></tr>`;
  }
}

function updateSummary(){
  const rows = document.querySelectorAll('.cart-items tbody tr.item-row');
  let subtotal = 0;
  rows.forEach(tr=>{
    const unit = Number(tr.dataset.unitPrice) || 0;
    const qty  = Math.max(1, parseInt(tr.querySelector('.qty-input').value||'1',10));
    subtotal  += unit * qty;
  });

  const subEl = document.getElementById('subtotal');
  if (subEl) subEl.textContent = formatBRL(subtotal);

  const freteEl = document.getElementById('frete');
  const frete = freteEl ? parseBRL(freteEl.textContent) : 0;

  const totalEl = document.getElementById('total');
  if (totalEl) totalEl.textContent = formatBRL(subtotal + frete);
}

/* ============ Delegação de eventos (quantidade) ============ */
function initQtyHandlers(){
  const tbody = document.querySelector('.cart-items tbody');
  if (!tbody || tbody.dataset.bound === '1') return;
  tbody.dataset.bound = '1';

  tbody.addEventListener('click', e=>{
    const btn = e.target.closest('.qty-btn');
    if(!btn) return;

    const tr = e.target.closest('tr.item-row');
    if(!tr) return;

    const input = tr.querySelector('.qty-input');
    const current = Math.max(1, parseInt(input.value || '1', 10));

    if(btn.dataset.op === 'dec'){
      if(current <= 1){
        openRemoveConfirm(
          ()=> removeRowAndPersist(tr),
          ()=> handleQtyChange(tr, 1)
        );
      }else{
        handleQtyChange(tr, current - 1);
      }
    }else if(btn.dataset.op === 'inc'){
      handleQtyChange(tr, current + 1);
    }
  });

  tbody.addEventListener('input', e=>{
    const input = e.target;
    if(!input.classList.contains('qty-input')) return;
    const tr = input.closest('tr.item-row');
    handleQtyChange(tr, input.value);
  });
}

/* ============ Validação de checkout (endereço obrigatório) ============ */
(function initCheckoutValidation(){
  const form = document.getElementById('checkout-form');
  if(!form) return;

  const endereco = document.getElementById('endereco');
  const enderecoError = document.getElementById('endereco-error');

  function clearAddressError(){
    endereco.classList.remove('input-error');
    endereco.removeAttribute('aria-invalid');
    if(enderecoError) enderecoError.textContent = '';
  }
  endereco?.addEventListener('input', clearAddressError);

  form.addEventListener('submit', (e)=>{
    clearAddressError();
    const value = (endereco?.value || '').trim();

    if(!value){
      e.preventDefault();
      endereco.classList.add('input-error');
      endereco.setAttribute('aria-invalid','true');
      if(enderecoError){
        enderecoError.textContent = 'Informe seu endereço (rua e número).';
      }
      endereco?.focus();
      return;
    }

    // TODO: enviar/redirect
    // e.g. window.location.href = 'pagamento.html';
  });
})();

/* ============ Toggle do menu lateral com animação ============ */
(function(){
  const overlay = document.getElementById('nav-overlay');
  const openBtn = document.querySelector('.menu .menu-btn');
  const closeBtn = document.querySelector('#nav-overlay .nav-close');

  if(!overlay || !openBtn || !closeBtn) return;

  const open = () => {
    overlay.classList.add('open');
    document.body.classList.add('noscroll');
    overlay.setAttribute('aria-hidden', 'false');
  };
  const close = () => {
    overlay.classList.remove('open');
    document.body.classList.remove('noscroll');
    overlay.setAttribute('aria-hidden', 'true');
  };

  openBtn.addEventListener('click', open);
  closeBtn.addEventListener('click', close);
  overlay.addEventListener('click', e => {
    if(e.target === overlay) close();
  });
  document.addEventListener('keydown', e=>{
    if(e.key === 'Escape') close();
  });
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


/* ============ Init ============ */
document.addEventListener('DOMContentLoaded', renderCart);
