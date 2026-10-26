// ==========================================
// CONFIGURAÇÃO E CONSTANTES
// ==========================================
const WHATSAPP_NUMERO = "5548999999999"; // Altere para o DDI + DDD + número da loja
const CHAVE_STORAGE = "dolcifreddo-sacola-v1";

// Mapeamento de tags para exibição dos selos (badges)
const TAGS_NOME = {
  zl: "Zero lactose",
  sg: "Sem glúten",
  vg: "Opção vegana",
  pe: "Molho pelati italiano"
};

// ==========================================
// DADOS DO CARDÁPIO (9 produtos no total)
// ==========================================
const CATEGORIAS = [
  {
    id: "gelato700",
    name: "Gelatos · Pote 700ml",
    note: "Gelato italiano artesanal.",
    items: [
      { name: "Morango", desc: "Sorbet de fruta à base de água.", price: 49.40, tags: "zl" },
      { name: "Chocolate Belga", desc: "", price: 58.90, tags: "" },
      { name: "Doce de Leite", desc: "", price: 58.90, tags: "" }
    ]
  },
  {
    id: "napolitanas",
    name: "Pizzas Napolitanas",
    note: "25 cm · 4 fatias. Massa de longa fermentação, farinha italiana, molho pelati italiano.",
    items: [
      { name: "Pizza Marguerita", desc: "", price: 36.00, tags: "pe" },
      { name: "Pizza Calabresa", desc: "", price: 36.00, tags: "pe" },
      { name: "Pizza Quatro Queijos", desc: "Mussarela, provolone, parmesão, cheddar e molho vermelho.", price: 36.00, tags: "pe" }
    ]
  },
  {
    id: "bebidas",
    name: "Bebidas",
    note: "",
    items: [
      { name: "Coca-Cola Original 310ml", desc: "", price: 6.65, tags: "" },
      { name: "Guaraná Antarctica 350ml", desc: "", price: 6.65, tags: "" },
      { name: "Agua", desc: "", price: 4.75, tags: "" }
    ]
  }
];

// ==========================================
// ESTADO DA APLICAÇÃO
// ==========================================
const itensCatalogo = {}; // Armazena os dados de cada produto pelo ID gerado
let carrinho = {};        // Armazena a quantidade de cada produto ID no carrinho
const filtrosAtivos = new Set();

// Carrega o carrinho salvo anteriormente no navegador (se houver)
try {
  carrinho = JSON.parse(localStorage.getItem(CHAVE_STORAGE)) || {};
} catch (e) {
  carrinho = {};
}

// Atalhos para seleção de elementos e formatação
const $ = (selector) => document.querySelector(selector);
const formatarMoeda = (valor) => valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const normalizarTexto = (texto) => texto.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

// ==========================================
// RENDERIZAÇÃO DO CARDÁPIO E ABAS
// ==========================================
const containerMenu = $("#menu");
const containerAbas = $("#tabs");

CATEGORIAS.forEach((categoria) => {
  // Cria a seção da categoria no HTML
  const secao = document.createElement("section");
  secao.className = "cat";
  secao.id = categoria.id;
  
  let htmlCabecalho = `<div class="cat__head"><h2>${categoria.name}</h2>`;
  if (categoria.note) {
    htmlCabecalho += `<p>${categoria.note}</p>`;
  }
  htmlCabecalho += `</div><div class="grid"></div>`;
  secao.innerHTML = htmlCabecalho;
  
  const gridProdutos = secao.querySelector(".grid");

  // Adiciona cada item na grade da categoria
  categoria.items.forEach((item, index) => {
    const idProduto = `${categoria.id}-${index}`;
    const listaTags = item.tags ? item.tags.split(" ") : [];
    
    // Salva as referências globais do produto
    itensCatalogo[idProduto] = {
      name: item.name,
      cat: categoria.name,
      price: item.price
    };

    const cartao = document.createElement("article");
    cartao.className = "card";
    cartao.dataset.id = idProduto;
    cartao.dataset.tags = item.tags;
    cartao.dataset.search = normalizarTexto(`${item.name} ${item.desc} ${listaTags.map(t => TAGS_NOME[t]).join(" ")}`);
    
    const caminhoImagem = `${item.name}.jpg`;

    // Monta os badges de tags, se houver
    let badgesHtml = "";
    if (listaTags.length > 0) {
      badgesHtml = `<div class="badges">` + listaTags.map(tag => `<span class="badge badge--${tag}">${TAGS_NOME[tag]}</span>`).join("") + `</div>`;
    }

    cartao.innerHTML = `
      <h3>${item.name}</h3>
      ${badgesHtml}
      <p>${item.desc || ""}</p>
      <div class="card__foot">
        <div class="card__action-area">
          <a href="${caminhoImagem}" target="_blank" class="card__img-link">
            <img src="${caminhoImagem}" alt="${item.name}" class="card__img" loading="lazy" onerror="this.style.display='none'">
          </a>
          <div class="price-and-act">
            <span class="price">${formatarMoeda(item.price)}</span>
            <span class="act"></span>
          </div>
        </div>
      </div>`;
    
    gridProdutos.appendChild(cartao);
  });

  containerMenu.appendChild(secao);

  // Cria o botão da aba correspondente no topo
  const botaoAba = document.createElement("button");
  botaoAba.className = "tab";
  botaoAba.textContent = categoria.name;
  botaoAba.dataset.target = categoria.id;
  containerAbas.appendChild(botaoAba);
});

// Atualiza o botão do card (Adicionar ou seletor de quantidade)
function atualizarCard(card) {
  const id = card.dataset.id;
  const quantidade = carrinho[id] || 0;
  const areaAcao = card.querySelector(".act");
  
  card.classList.toggle("in-cart", quantidade > 0);
  
  if (quantidade > 0) {
    areaAcao.innerHTML = `
      <span class="step">
        <button data-a="dec" aria-label="Diminuir">−</button>
        <output>${quantidade}</output>
        <button data-a="inc" aria-label="Aumentar">+</button>
      </span>`;
  } else {
    areaAcao.innerHTML = `<button class="add" data-a="inc">Adicionar</button>`;
  }
}

const todosCards = [...document.querySelectorAll(".card")];
todosCards.forEach(atualizarCard);

// ==========================================
// LÓGICA DO CARRINHO E SACOLA
// ==========================================
const calcularQuantidadeTotal = () => Object.values(carrinho).reduce((total, qtd) => total + qtd, 0);
const calcularPrecoTotal = () => Object.entries(carrinho).reduce((total, [id, qtd]) => total + itensCatalogo[id].price * qtd, 0);

function alterarQuantidade(id, delta) {
  const novaQtd = (carrinho[id] || 0) + delta;
  if (novaQtd <= 0) {
    delete carrinho[id];
  } else {
    carrinho[id] = novaQtd;
  }
  sincronizarCarrinho();
}

function sincronizarCarrinho() {
  // Salva no armazenamento local do navegador
  try {
    localStorage.setItem(CHAVE_STORAGE, JSON.stringify(carrinho));
  } catch (e) {}

  // Atualiza a visualização dos cards na tela
  todosCards.forEach(atualizarCard);

  const qtdTotal = calcularQuantidadeTotal();
  const precoTotal = calcularPrecoTotal();

  // Atualiza os textos de total na interface
  $("#fc").textContent = qtdTotal;
  $("#ft").textContent = formatarMoeda(precoTotal);
  $("#total").textContent = formatarMoeda(precoTotal);

  $("#fab").hidden = qtdTotal === 0;
  $("#send").disabled = qtdTotal === 0;

  const containerLinhas = $("#lines");
  
  // Se o carrinho estiver vazio
  if (qtdTotal === 0) {
    containerLinhas.innerHTML = `<p class="drawer__empty">Sua sacola está vazia.<br>Adicione itens do cardápio para começar.</p>`;
    if ($("#drawer").classList.contains("open")) alternarGaveta(false);
    return;
  }

  // Preserva o texto digitado anteriormente nos inputs se houver
  const observacaoAtual = containerLinhas.querySelector("textarea")?.value || "";
  const nomeAtual = containerLinhas.querySelector("input")?.value || "";

  // Constrói a lista de itens dentro da sacola
  let htmlLinhas = "";
  Object.entries(carrinho).forEach(([id, qtd]) => {
    const item = itensCatalogo[id];
    htmlLinhas += `
      <div class="line" data-id="${id}">
        <div>
          <b>${item.name}</b>
          <div class="sub">${item.cat} · ${formatarMoeda(item.price)}</div>
        </div>
        <div class="lt">${formatarMoeda(item.price * qtd)}</div>
        <div class="line__ctl">
          <span class="step">
            <button data-a="dec" aria-label="Diminuir">−</button>
            <output>${qtd}</output>
            <button data-a="inc" aria-label="Aumentar">+</button>
          </span>
          <button class="rm" data-a="rm">Remover</button>
        </div>
      </div>`;
  });

  htmlLinhas += `
    <label class="field">
      <span>Seu nome</span>
      <input id="cname" placeholder="Como podemos te chamar?" autocomplete="name" value="${nomeAtual}">
    </label>
    <label class="field">
      <span>Observações do pedido</span>
      <textarea id="note" rows="3" placeholder="Ex.: retirada ou entrega">${observacaoAtual}</textarea>
    </label>`;

  containerLinhas.innerHTML = htmlLinhas;
}

// Eventos de clique nos botões de adicionar dos produtos
containerMenu.addEventListener("click", (e) => {
  const botao = e.target.closest("button[data-a]");
  if (!botao) return;
  const card = botao.closest(".card");
  if (!card) return;
  const id = card.dataset.id;
  const acao = botao.dataset.a;
  
  alterarQuantidade(id, acao === "inc" ? 1 : -1);
  if (acao === "inc" && carrinho[id] === 1) {
    mostrarToast(itensCatalogo[id].name + " adicionado");
  }
});

// Eventos de clique dentro da gaveta do carrinho
$("#lines").addEventListener("click", (e) => {
  const botao = e.target.closest("button[data-a]");
  if (!botao) return;
  const linha = botao.closest(".line");
  if (!linha) return;
  const id = linha.dataset.id;
  const acao = botao.dataset.a;

  if (acao === "rm") {
    delete carrinho[id];
    sincronizarCarrinho();
  } else {
    alterarQuantidade(id, acao === "inc" ? 1 : -1);
  }
});

// ==========================================
// CONTROLE DA GAVETA (DRAWER) DO CARRINHO
// ==========================================
const drawer = $("#drawer");
const scrim = $("#scrim");

function alternarGaveta(abrir) {
  drawer.classList.toggle("open", abrir);
  scrim.classList.toggle("open", abrir);
  drawer.setAttribute("aria-hidden", !abrir);
  document.body.style.overflow = abrir ? "hidden" : "";
}

$("#fab").onclick = () => alternarGaveta(true);
$("#close").onclick = scrim.onclick = () => alternarGaveta(false);

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && drawer.classList.contains("open")) {
    alternarGaveta(false);
  }
});

// ==========================================
// ENVIO DO PEDIDO PARA O WHATSAPP
// ==========================================
$("#send").onclick = () => {
  if (calcularQuantidadeTotal() === 0) return;
  
  const nomeCliente = $("#cname")?.value.trim() || "";
  const observacao = $("#note")?.value.trim() || "";
  
  let mensagem = `*Pedido · Dolci Freddo*\n`;
  if (nomeCliente) {
    mensagem += `Cliente: ${nomeCliente}\n`;
  }
  mensagem += `\n`;

  Object.entries(carrinho).forEach(([id, qtd]) => {
    const item = itensCatalogo[id];
    mensagem += `• ${qtd}x ${item.name} (${item.cat}) — ${formatarMoeda(item.price * qtd)}\n`;
  });

  mensagem += `\n*Total: ${formatarMoeda(calcularPrecoTotal())}*`;
  if (observacao) {
    mensagem += `\n\nObservações: ${observacao}`;
  }
  mensagem += `\n\nPode confirmar, por favor?`;

  const urlWhatsApp = `https://wa.me/${WHATSAPP_NUMERO}?text=${encodeURIComponent(mensagem)}`;
  window.open(urlWhatsApp, "_blank", "noopener");
};

// Alerta visual rápido (Toast)
let tempoToast;
function mostrarToast(mensagem) {
  const toastEl = $("#toast");
  toastEl.textContent = mensagem;
  toastEl.classList.add("show");
  clearTimeout(tempoToast);
  tempoToast = setTimeout(() => toastEl.classList.remove("show"), 1600);
}