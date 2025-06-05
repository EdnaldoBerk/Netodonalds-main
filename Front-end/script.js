let infoFood = {};
let infoFillings = [];
let currentFoodId = null; // Stores the ID of the currently selected food

// DOM Elements for Food Dropdown
const foodDropdownButton = document.getElementById('foodDropdownButton');
const foodDropdownOptions = document.getElementById('foodDropdownOptions');
const cpfInputEl = document.getElementById('cpf');
const priceEl = document.getElementById('price');
const purchaseHistoryContainerEl = document.getElementById('purchaseHistory');

// --- Food Dropdown Logic ---
async function loadFoodOptions() {
  try {
    const response = await fetch("http://localhost:8080/foods");
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const foods = await response.json();

    foodDropdownOptions.innerHTML = ''; // Clear existing options

    if (foods && foods.length > 0) {
      foods.forEach(food => {
        const optionElement = document.createElement('a'); // Using <a> for dropdown items
        optionElement.href = "#"; // Prevent page jump
        optionElement.textContent = `${food.name} (R$ ${parseFloat(food.price).toFixed(2)})`;
        optionElement.dataset.foodId = food.id;
        optionElement.dataset.foodName = food.name; // Store name for button update
        
        optionElement.addEventListener('click', (e) => {
          e.preventDefault(); // Prevent default anchor action
          const selectedFoodId = e.target.dataset.foodId;
          const selectedFoodName = e.target.dataset.foodName;
          
          getFood(selectedFoodId); // Load selected food details and fillings
          // The getFood function will now also update the button text
          foodDropdownOptions.style.display = 'none'; // Hide options
        });
        foodDropdownOptions.appendChild(optionElement);
      });
    } else {
      foodDropdownOptions.innerHTML = '<li>Nenhuma comida disponível</li>';
    }
  } catch (error) {
    console.error("Erro ao carregar opções de comida:", error);
    foodDropdownOptions.innerHTML = '<li>Erro ao carregar comidas</li>';
    // Optionally, show a custom alert to the user
    showCustomAlert("Não foi possível carregar as opções de comida. Verifique a conexão com o servidor.", "Erro de Rede");
  }
}

foodDropdownButton.addEventListener('click', () => {
  const currentDisplay = foodDropdownOptions.style.display;
  foodDropdownOptions.style.display = currentDisplay === 'block' ? 'none' : 'block';
});

// Close dropdown if clicked outside
document.addEventListener('click', function(event) {
    if (!foodDropdownButton.contains(event.target) && !foodDropdownOptions.contains(event.target)) {
        foodDropdownOptions.style.display = 'none';
    }
});

function isValidCpf(cpf) {
  return /^\d{3,11}$/.test(cpf);
}

async function getFood(idFood) {
  currentFoodId = idFood;
  try { // Added try-catch for robustness
    const response = await fetch("http://localhost:8080/food/" + idFood);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();

    if (data.food && data.food.length > 0) {
        infoFood = data.food[0];
        if (foodDropdownButton && infoFood.name) {
            foodDropdownButton.innerHTML = `${infoFood.name} <span class="arrow">▼</span>`;
        }
    } else {
        infoFood = {};
        if (foodDropdownButton) {
            foodDropdownButton.innerHTML = 'Selecione seu Lanche <span class="arrow">▼</span>';
        }
        showCustomAlert(`Comida com ID ${idFood} não encontrada.`, "Erro ao buscar comida");
        
        document.querySelector(".fillings").innerHTML = "<p>Selecione uma comida válida para ver os recheios.</p>";
        document.querySelector("#price").innerHTML = "0.00";
        return; 
    }

    infoFillings = data.fillings || []; 

    renderFillings();
    updateTotalPrice();
  } catch (error) {
    console.error("Erro ao buscar detalhes da comida:", error);
    showCustomAlert("Não foi possível buscar os detalhes da comida. Verifique a conexão.", "Erro de Rede");
    
    if (foodDropdownButton) {
        foodDropdownButton.innerHTML = 'Selecione seu Lanche <span class="arrow">▼</span>';
    }
    document.querySelector(".fillings").innerHTML = "<p>Erro ao carregar recheios.</p>";
    document.querySelector("#price").innerHTML = "0.00";
  }
}

function renderFillings() {
  const fillingsContainer = document.querySelector(".fillings");
  fillingsContainer.innerHTML = "";

  for (let i = 0; i < infoFillings.length; i++) {
    const filling = infoFillings[i];
    let div = document.createElement("div");
    div.innerHTML = `<input type="checkbox" id="filling-${i}" data-price="${filling.price}" data-name="${filling.name}" onchange="updateTotalPrice()" /> <label for="filling-${i}">${filling.name} (R$ ${filling.price.toFixed(2)})</label>`;
    fillingsContainer.appendChild(div);
  }
}

function updateTotalPrice() {
  let totalPrice = parseFloat(infoFood.price || 0);
  const checkboxes = document.querySelectorAll(".fillings input[type='checkbox']");

  checkboxes.forEach(checkbox => {
    if (checkbox.checked) {
      totalPrice += parseFloat(checkbox.dataset.price);
    }
  });

  priceEl.innerHTML = totalPrice.toFixed(2);
}

// Call getFood first to set the initial button text correctly
getFood(1).then(() => {
    loadFoodOptions(); 
}).catch(error => {
    console.error("Erro na carga inicial de getFood(1):", error);
    loadFoodOptions(); 
});

document.getElementById('payButton').addEventListener('click', handlePayment);

document.getElementById('historyButton').addEventListener('click', fetchPurchaseHistory);

// --- Custom Alert Modal Logic ---
const customAlertModalOverlay = document.getElementById('customAlertModalOverlay');
const customAlertTitle = document.getElementById('customAlertTitle');
const customAlertMessage = document.getElementById('customAlertMessage');
const customAlertCloseButton = document.getElementById('customAlertCloseButton');

function showCustomAlert(message, title = "Atenção") {
  customAlertTitle.textContent = title;
  customAlertMessage.textContent = message;
  customAlertModalOverlay.style.display = 'flex'; 
}

customAlertCloseButton.addEventListener('click', () => {
  customAlertModalOverlay.style.display = 'none';
});

customAlertModalOverlay.addEventListener('click', (event) => {
    if (event.target === customAlertModalOverlay) { 
        customAlertModalOverlay.style.display = 'none';
    }
});

async function handlePayment() {
  const cpf = cpfInputEl.value;
  const totalPrice = parseFloat(priceEl.textContent);

  if (!currentFoodId) {
    showCustomAlert("Por favor, selecione uma comida.");
    return;
  }

  if (!cpf) {
    showCustomAlert("Por favor, insira o CPF.");
    return;
  }

  if (!isValidCpf(cpf)) {
    showCustomAlert("CPF inválido. Deve conter de 3 a 11 dígitos.");
    return;
  }

  const selectedFillings = [];
  const checkboxes = document.querySelectorAll(".fillings input[type='checkbox']:checked");
  checkboxes.forEach(checkbox => {
    selectedFillings.push(checkbox.dataset.name);
  });

  let description = infoFood.name;
  if (selectedFillings.length > 0) {
    description += " com " + selectedFillings.join(', ');
  }

  const payDate = new Date().toISOString().split('T')[0];

  const payInfo = {
    id_foods: currentFoodId,
    cpf: cpf,
    pay_date: payDate,
    description: description,
    price: totalPrice
  };

  console.log("Enviando para o backend:", payInfo);

  try {
    const response = await fetch('http://localhost:8080/payment', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payInfo),
    });

    if (response.ok) {
      await response.json();
      showCustomAlert("Pagamento realizado com sucesso!", "Sucesso");
      cpfInputEl.value = '';
      checkboxes.forEach(checkbox => checkbox.checked = false);
      getFood(currentFoodId);
    } else {
      const errorResult = await response.text(); 
      showCustomAlert(`Erro ao processar pagamento: ${response.status} - ${errorResult}`, "Erro no Pagamento");
    }
  } catch (error) {
    console.error("Erro no fetch do pagamento:", error);
    showCustomAlert("Erro de comunicação ao tentar realizar o pagamento.", "Erro de Comunicação");
  }
}

async function fetchPurchaseHistory() {
  const cpf = cpfInputEl.value;
  purchaseHistoryContainerEl.innerHTML = '';

  if (!cpf) {
    showCustomAlert("Por favor, insira o CPF para buscar o histórico.");
    purchaseHistoryContainerEl.innerHTML = '<p>Por favor, insira o CPF acima para ver o histórico.</p>';
    return;
  }

  if (!isValidCpf(cpf)) {
    showCustomAlert("CPF inválido para busca de histórico. Deve conter de 3 a 11 dígitos.");
    purchaseHistoryContainerEl.innerHTML = '<p>CPF inválido.</p>';
    return;
  }

  console.log(`Buscando histórico para o CPF: ${cpf}`);

  try {
    const response = await fetch(`http://localhost:8080/history/${cpf}`);

    if (response.ok) {
      const historyData = await response.json();
      if (historyData && historyData.length > 0) {
        const ul = document.createElement('ul');
        historyData.forEach(item => {
          const li = document.createElement('li');
          const itemDate = new Date(item.pay_date).toLocaleDateString('pt-BR');
          li.textContent = `Data: ${itemDate}, Pedido: ${item.description}, Preço: R$ ${parseFloat(item.price).toFixed(2)}`;
          ul.appendChild(li);
        });
        purchaseHistoryContainerEl.appendChild(ul);
      } else {
        purchaseHistoryContainerEl.innerHTML = '<p>Nenhum histórico de compras encontrado para este CPF.</p>';
      }
    } else {
      const errorResult = await response.text();
      console.error("Erro ao buscar histórico:", errorResult);
      purchaseHistoryContainerEl.innerHTML = `<p>Erro ao buscar histórico: ${response.status} - ${errorResult}. O endpoint /history pode não estar implementado no backend.</p>`;
    }
  } catch (error) {
    console.error("Erro de comunicação ao buscar histórico:", error);
    purchaseHistoryContainerEl.innerHTML = '<p>Erro de comunicação ao tentar buscar o histórico. Verifique se o backend está rodando.</p>';
  }
}
