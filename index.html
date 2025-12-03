<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Food Ordering Website</title>
  <script src="https://checkout.razorpay.com/v1/checkout.js"></script>
  <style>
    body { font-family: Arial, sans-serif; margin: 0; padding: 0; background: #f5f5f5; }
    header { background: #ff4500; padding: 18px; color: #fff; text-align: center; font-size: 26px; font-weight: bold; }
    .container { width: 90%; margin: auto; padding: 20px; }
    .item { background: #fff; padding: 15px; margin-bottom: 15px; border-radius: 12px; box-shadow: 0 0 6px rgba(0,0,0,0.1); }
    button { background: #ff4500; color: #fff; padding: 10px 15px; border: none; border-radius: 6px; cursor: pointer; font-size: 16px; }
    button:hover { background: #e03e00; }
    .cart-section { margin-top: 20px; background: #fff; padding: 20px; border-radius: 12px; box-shadow: 0 0 6px rgba(0,0,0,0.1); }
    h2 { margin-top: 0; }
    ul { padding-left: 20px; }
  </style>
</head>
<body>
  <header>🍔 Food Ordering Website</header>

  <div class="container">
    <h2>Menu</h2>

    <div class="item">
      <h3>Pizza</h3>
      <p>Price: ₹199</p>
      <button onclick="addToCart('Pizza',199)">Add to Cart</button>
    </div>

    <div class="item">
      <h3>Burger</h3>
      <p>Price: ₹99</p>
      <button onclick="addToCart('Burger',99)">Add to Cart</button>
    </div>

    <div class="item">
      <h3>Momos</h3>
      <p>Price: ₹149</p>
      <button onclick="addToCart('Momos',149)">Add to Cart</button>
    </div>

    <div class="cart-section">
      <h2>🛒 Cart</h2>
      <ul id="cartList"></ul>
      <h3>Total: ₹<span id="totalAmount">0</span></h3>
      <button onclick="makePaymentRazorpay()">Proceed to Payment</button>
    </div>
  </div>

  <script>
    let cart = [];

    function addToCart(name, price) {
      cart.push({ name, price });
      updateCart();
    }

    function updateCart() {
      const cartList = document.getElementById('cartList');
      const totalAmount = document.getElementById('totalAmount');
      cartList.innerHTML = '';

      let total = 0;
      cart.forEach(item => {
        const li = document.createElement('li');
        li.textContent = ${item.name} - ₹${item.price};
        cartList.appendChild(li);
        total += item.price;
      });

      totalAmount.textContent = total;
    }

    function makePaymentRazorpay() {
      const total = document.getElementById('totalAmount').textContent;
      if(total == 0){ alert('Cart is empty'); return; }

      var options = {
        "key": "YOUR_RAZORPAY_KEY", 
        "amount": total * 100,
        "currency": "INR",
        "name": "Food Order Payment",
        "description": "Secure Payment",
        "handler": function (response){
            alert('Payment Successful! Payment ID: ' + response.razorpay_payment_id);
        },
        "theme": { "color": "#ff4500" }
      };

      var rzp1 = new Razorpay(options);
      rzp1.open();
    }
  </script>
</body>
</html>
