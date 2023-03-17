//variables
const open = document.getElementsByClassName("openPopup")
const close = document.getElementById("closePopup")
const submit = document.getElementById("submitPopup")
const popup = document.getElementById("popup")
const popupBackground = document.querySelector(".popupBackground")
const chosson = document.getElementsByClassName("chosson")
const kallah = document.getElementsByClassName("kallah")
const money = document.getElementById("amount")
const cart = document.querySelector(".first")
const errorMessage = document.getElementById("errorMessage")
const redx = document.getElementsByClassName("redx")
const cartCouple = document.getElementsByClassName("cartCouple")
const paymentButton = document.querySelector(".payment-button")
const check = document.getElementsByClassName("check")
const gift = document.getElementsByClassName("gift")
let couplesContainer = ""
let amount = 0
let cartCount = 0
// let checkCount = 0

//Add event listeners to all of the buttons (openButton, closeButton, and submitButton)
close.addEventListener('click', closePopup)
submit.addEventListener('click', submitPopup)

for(let i = 0; i < open.length; i++){
    open[i].addEventListener('click', function openPopup(){
        //anonymous function that opens the popup, and grabs the names and ammount

        // gift[i].classList.add("hideGift")
        // check[i].classList.add("revealCheck")

        popup.classList.add("open-popup")
        popupBackground.classList.add("open-popup-background")
        money.value = ''
        couplesContainer = `${chosson[i].innerHTML} <br>and<br>  ${kallah[i].innerHTML}`
        
        //keep count
        // checkCount = i
        
    })
}



//functions
function closePopup() {
    popup.classList.remove("open-popup")
    popupBackground.classList.remove("open-popup-background")
    errorMessage.innerHTML = ''
}

function submitPopup() {
    amount = money.value
    if (Number(amount) >= 1){
        closePopup()
        cart.innerHTML += 
        `<div class="cartCouple">
            <i class="fa-solid fa-circle-xmark redx"></i>
            <p>${couplesContainer}</p>
            <p>$${amount}</p>
        </div>`
        paymentButton.style.visibility = 'visible'
        cartCount ++


        //Delete couple from the cart
        for(let i = 0; i < redx.length; i++){
            redx[i].addEventListener('click', function deleteCouple() {

                
                cartCouple[i].style.transition = '0.1s'
                cartCouple[i].style.transform = 'scale(0)'
                setTimeout(() => {
                    cartCouple[i].style.display = 'none'
                }, 250);
                cartCount --
                if(cartCount < 1){
                    paymentButton.style.visibility = 'hidden'
                }
            })
        }
    }
    else{
        errorMessage.innerHTML = `<p style="color:red; margin-top: 20px;">Please enter an amount</p>`
    }
}