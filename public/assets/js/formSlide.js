//form validaiton for couple submission variables
const name = document.querySelector("#name")
const email = document.querySelector("#email")
const phoneNumber = document.querySelector("#phoneNumber")
const address = document.querySelector("#address")
const chossonName = document.querySelector("#chossonName")
// dont validate these:
// const chossonFatherTitle = document.querySelector("#chossonFatherTitle")
// const chossonFather = document.querySelector("#chossonFather")
// const chossonMotherTitle = document.querySelector("#chossonMotherTitle")
// const chossonMother = document.querySelector("#chossonMother")
const chossonOrigin = document.querySelector("#chossonOrigin")
const kallahName = document.querySelector("#kallahName")
// dont validate these:
// const kallahFatherTitle = document.querySelector("#kallahFatherTitle")
// const kallahFather = document.querySelector("#kallahFather")
// const kallahMotherTitle = document.querySelector("#kallahMotherTitle")
// const kallahMother = document.querySelector("#kallahMother")
const kallahOrigin = document.querySelector("#kallahOrigin")
const weddingDate = document.querySelector("#weddingDate")
const personalShoppers = document.querySelector("#personalShoppers")
const chesedPackage = document.querySelector("#chesedPackage")

console.log('hi')

const Form1 = document.querySelector("#Form1")
const Form2 = document.querySelector("#Form2")
const Form3 = document.querySelector("#Form3")
const Form = document.querySelector("#Form")

const Next1 = document.querySelector("#Next1")
const Next2 = document.querySelector("#Next2")
const Back1 = document.querySelector("#Back1")
const Back2 = document.querySelector("#Back2")
const Next = document.querySelector("#Next")
const Back = document.querySelector("#Back")

const progress = document.querySelector("#progress")

Next.onclick = function() {
    
    if(name.value == "") {
        showErrorModal("Please enter your name");
    }
    else if(phoneNumber.value == "") {
        showErrorModal("Please enter your phone number");
    }
    else if(email.value == "") {
        showErrorModal("Please enter your email");
    }
    else if(address.value == "") {
        showErrorModal("Please enter your address");
    }
    else if(name.value !== "" && email.value !== "" && phoneNumber.value !== "" && address.value !== "") {
        Form.style.left = "-450px";
        Form1.style.left = "40px";
        progress.style.width = "210px";
    }
}

Next1.onclick = function() {

    if(chossonName.value == "") {
        showErrorModal("Please enter the Chosson's name")
    }
    else if(chossonOrigin.value !== "detroit" && chossonOrigin.value !== "other") {
        showErrorModal("Please enter where the chosson is from")
    }

    else if(chossonName.value !== "" && chossonOrigin.value !== "") {

    Form1.style.left = "-450px";
    Form2.style.left = "40px";
    progress.style.width = "325px";
    }
}

Back.onclick = function () {
    Form.style.left = "40px";
    Form1.style.left = "450px";
    progress.style.width = "100px";
}

Back1.onclick = function() {
    Form1.style.left = "40px";
    Form2.style.left = "450px";
    progress.style.width = "210px";
}

Next2.onclick = function() {

    if(kallahName.value == "") {
        showErrorModal("Please enter the Kallah's name")
    }
    else if(kallahOrigin.value !== "detroit" && kallahOrigin.value !== "other") {
        showErrorModal("Please enter where the kallah is from")
    }
    else if(kallahName.value !== "" && kallahOrigin.value !== "") {

    Form2.style.left = "-450px";
    Form3.style.left = "40px";
    progress.style.width = "450px";
    }
}

Back2.onclick = function() {
    Form2.style.left = "40px";
    Form3.style.left = "450px";
    progress.style.width = "325px";
}


document.querySelector('.input-selector').addEventListener('click',()=>{
document.querySelector('.list').classList.toggle('show')
})
document.querySelector('.close-btn').addEventListener('click',()=>{
    document.querySelector('.list').classList.remove('show')
    })




document.querySelector("#showForm").addEventListener("click", function() {
    console.log("clicked")
    document.querySelector(".formPopup").classList.add("active")
    document.querySelector(".overlay").classList.add("overlayActive")
})
document.querySelector(".overlay").addEventListener("click", function() {
    document.querySelector(".formPopup").classList.remove("active")
    document.querySelector(".overlay").classList.remove("overlayActive")
})
document.querySelector("#close-btn").addEventListener("click", function() {
    document.querySelector(".formPopup").classList.remove("active")
    document.querySelector(".overlay").classList.remove("overlayActive")
})




// Function to display error modal
function showErrorModal(message) {
    const errorModal = document.createElement("div");
    errorModal.classList.add("error-modal");
  
    const errorIcon = document.createElement("div");
    errorIcon.innerHTML = '<i class="fas fa-circle-xmark"></i>';
    errorIcon.classList.add("error-icon");
  
    const errorMessage = document.createElement("div");
    errorMessage.textContent = message;
    errorMessage.classList.add("error-description");
  
    const dismissButton = document.createElement("button");
    dismissButton.textContent = "Dismiss";
    dismissButton.classList.add("dismiss-button");
    // dismissButton.setAttribute("aria-label", "Dismiss error");
  
    errorModal.appendChild(errorIcon);
    errorModal.appendChild(errorMessage);
    errorModal.appendChild(dismissButton);
  
    document.body.appendChild(errorModal);
  
    // Show modal
    setTimeout(() => {
      errorModal.classList.add("active");
    }, 100);
  
    // Hide modal
    dismissButton.addEventListener("click", () => {
      errorModal.classList.remove("active");
  
      setTimeout(() => {
        document.body.removeChild(errorModal);
      }, 300);
    });
  }
  
  