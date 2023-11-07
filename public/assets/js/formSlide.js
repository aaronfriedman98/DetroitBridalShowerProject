  // JavaScript functions to open and close the parent modals
  function openDeceasedModal() {
    console.log("open")
    let parentModal1 = document.querySelector(".myModal1");
    parentModal1.style.display = "block";
    // parentModalModal.style.left = "calc(100% + 20px)"; // Adjust the distance from the button
}

//deceased modal functions
function closeDeceasedModal() {
    document.querySelector(".myModal1").style.display = "none";
    document.querySelector("#deceased").value = ""
}

function submitDeceasedModal() {
    document.querySelector(".myModal1").style.display = "none";
}

function openDeceasedModal2() {
    console.log("open")
    let parentModal2 = document.querySelector(".myModal2");
    parentModal2.style.display = "block";
    // parentModalModal.style.left = "calc(100% + 20px)"; // Adjust the distance from the button
}

//deceased modal functions
function closeDeceasedModal2() {
    document.querySelector(".myModal2").style.display = "none";
    document.querySelector("#deceased2").value = ""
}

function submitDeceasedModal2() {
    document.querySelector(".myModal2").style.display = "none";
}

//divorced fields functions
// function openDivorcedFields() {
//     document.querySelector(".divorced").style.display = "block";
//     document.querySelector(".formPopup").style.height = "550px"; //moved up 100px
//     document.querySelector(".divorcedButton").style.top = "355px"; //moved up 200px
//     document.querySelector(".deseasedButton").style.top = "355px"; //moved up 200px
// }
let divorced = false
let divorced2 = false

const divorcedElements = document.querySelectorAll(".divorced");
const formPopup = document.querySelector(".formPopup");
const divorcedButton = document.querySelector(".divorcedButton");
const deseasedButton = document.querySelector(".deseasedButton");



function openDivorcedFields() {


//swap divorced fields
const divorcedField = document.querySelector(".divorcedField");
const nonDivorcedField = document.querySelector(".nonDivorcedField");
divorcedField.classList.toggle("swapField");
nonDivorcedField.classList.toggle("swapField");

// Rotate the arrow
const arrow = document.querySelector(".angle1");
arrow.classList.toggle("rotate180");

// Check if the elements are currently displayed (visible)
const isDisplayed = divorcedElements[0].style.display === "block";

if (isDisplayed) {
// Elements are currently displayed, so hide them

divorced = false

for (const element of divorcedElements) {
    element.style.display = "none";
}
formPopup.style.height = "450px"; // Adjustd the height accordingly
divorcedButton.style.top = "260px"; // Adjust the top position accordingly
deseasedButton.style.top = "260px"; // Adjust the top position accordingly
} else {
// Elements are currently hidden, so show them

divorced = true

for (const element of divorcedElements) {
    element.style.display = "block";
}
formPopup.style.height = "550px"; // Adjust the height accordingly
divorcedButton.style.top = "355px"; // Adjust the top position accordingly
deseasedButton.style.top = "355px"; // Adjust the top position accordingly
}
}


const divorcedButton2 = document.querySelector(".divorcedButton2");
const deseasedButton2 = document.querySelector(".deseasedButton2");

const divorcedElements2 = document.querySelectorAll(".divorced2");

function openDivorcedFields2() {


    //swap divorced fields
    const divorcedField2 = document.querySelector(".divorcedField2");
    const nonDivorcedField2 = document.querySelector(".nonDivorcedField2");
    divorcedField2.classList.toggle("swapField");
    nonDivorcedField2.classList.toggle("swapField");
    
    // Rotate the arrow
    const arrow2 = document.querySelector(".angle2");
    arrow2.classList.toggle("rotate180");
    
    // Check if the elements are currently displayed (visible)
    const isDisplayed = divorcedElements2[0].style.display === "block";
    
    if (isDisplayed) {
    // Elements are currently displayed, so hide them
    
    divorced2 = false
    
    for (const element of divorcedElements2) {
        element.style.display = "none";
    }
    formPopup.style.height = "450px"; // Adjustd the height accordingly
    divorcedButton2.style.top = "260px"; // Adjust the top position accordingly
    deseasedButton2.style.top = "260px"; // Adjust the top position accordingly
    } else {
    // Elements are currently hidden, so show them
    
    divorced2 = true
    
    for (const element of divorcedElements2) {
        element.style.display = "block";
    }
    formPopup.style.height = "550px"; // Adjust the height accordingly
    divorcedButton2.style.top = "355px"; // Adjust the top position accordingly
    deseasedButton2.style.top = "355px"; // Adjust the top position accordingly
    }
    }


function closeParentModal1() {
    document.querySelector(".myModal1").style.display = "none";
    document.querySelector("#addParentChossonFatherTitle").value = "Title"
    document.querySelector("#addParentChossonFatherName").value = ""
    document.querySelector("#addParentChossonMotherTitle").value = "Title"
    document.querySelector("#addParentChossonMotherName").value = ""

}
function submitParentModal1() {
    document.querySelector(".myModal1").style.display = "none";
}

function openParentModal2() {
    console.log("open")
    let parentModal2 = document.querySelector(".myModal2");
    parentModal2.style.display = "block";
    // parentModalModal.style.left = "calc(100% + 20px)"; // Adjust the distance from the button
}

function closeParentModal2() {
    document.querySelector(".myModal2").style.display = "none";
    document.querySelector("#addParentKallahFatherTitle").value = "Title"
    document.querySelector("#addParentKallahFatherName").value = ""
    document.querySelector("#addParentKallahMotherTitle").value = "Title"
    document.querySelector("#addParentKallahMotherName").value = ""
}
function closeParentModal2() {
    document.querySelector(".myModal2").style.display = "none";
}



//form validaiton for couple submission variables
const name = document.querySelector("#name")
const email = document.querySelector("#email")
const phoneNumber = document.querySelector("#phoneNumber")
const address = document.querySelector("#address")
const chossonName = document.querySelector("#chossonName")

const chossonFatherTitle = document.querySelector("#chossonFatherTitle")
const chossonFatherName = document.querySelector("#chossonFatherName")
const chossonMotherTitle = document.querySelector("#chossonMotherTitle")
const chossonMotherName = document.querySelector("#chossonMotherName")
const chossonOrigin = document.querySelector("#chossonOrigin")
const kallahName = document.querySelector("#kallahName")
const kallahFatherTitle = document.querySelector("#kallahFatherTitle")
const kallahFatherName = document.querySelector("#kallahFatherName")
const kallahMotherTitle = document.querySelector("#kallahMotherTitle")
const kallahMotherName = document.querySelector("#kallahMotherName")

const chossonMotherDivorcedTitle = document.querySelector("#chossonMotherDivorcedTitle")
const chossonMotherDivorcedName = document.querySelector("#chossonMotherDivorcedName")
const chossonMotherHusbandTitle = document.querySelector("#chossonMotherHusbandTitle")
const chossonMotherHusbandName = document.querySelector("#chossonMotherHusbandName")
const kallahMotherDivorcedTitle = document.querySelector("#kallahMotherDivorcedTitle")
const kallahMotherDivorcedName = document.querySelector("#kallahMotherDivorcedName")
const kallahMotherHusbandTitle = document.querySelector("#kallahMotherHusbandTitle")
const kallahMotherHusbandName = document.querySelector("#kallahMotherHusbandName")

// const addParentChossonFatherTitle = document.querySelector("#addParentChossonFatherTitle")
// const addParentChossonFatherName = document.querySelector("#addParentChossonFatherName")
// const addParentChossonMotherTitle = document.querySelector("#addParentChossonMotherTitle")
// const addParentChossonMotherName = document.querySelector("#addParentChossonMotherName")
// const addParentKallahFatherTitle = document.querySelector("#addParentKallahFatherTitle")
// const addParentKallahFatherName = document.querySelector("#addParentKallahFatherName")
// const addParentKallahMotherTitle = document.querySelector("#addParentKallahMotherTitle")
// const addParentKallahMotherName = document.querySelector("#addParentKallahMotherName")
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

        if(divorced) {
            formPopup.style.height = "550px"; // Adjust the height accordingly
            divorcedButton.style.top = "355px"; // Adjust the top position accordingly
            deseasedButton.style.top = "355px"; // Adjust the top position accordingly
        }

        Form.style.left = "-450px";
        Form1.style.left = "40px";
        progress.style.width = "210px";
    }
}

Next1.onclick = function() {

    if(chossonName.value == "") {
        showErrorModal("Please enter the Chosson's name")
    }
    
    else if(chossonFatherTitle.value === "" || chossonFatherTitle.value === "Title" || chossonFatherName.value === "") {
        showErrorModal("Please enter the Chosson's father's full name")
    }


    else if(divorced === false && (chossonMotherTitle.value === "" || chossonMotherTitle.value === "Title" || chossonMotherName.value === "")) {
        // if(chossonMotherDivorcedTitle.value === "" || chossonMotherDivorcedTitle.value === "Title" || chossonMotherDivorcedName.value === "") {
        showErrorModal("Please enter the Chosson's mother's full name")
        // }
        // else if (chossonName.value !== "" && chossonOrigin.value !== ""){
        //     Form1.style.left = "-450px";
        //     Form2.style.left = "40px";
        //     progress.style.width = "325px";
        // }
    }
    else if(divorced === true && (chossonMotherDivorcedTitle.value === "" || chossonMotherDivorcedTitle.value === "Title" || chossonMotherDivorcedName.value === "")) {
        showErrorModal("Please enter the Chosson's mother's full name")
    }
    else if(chossonOrigin.value !== "detroit" && chossonOrigin.value !== "other") {
        showErrorModal("Please enter where the chosson is from")
    }

    //check if any of the optional fields have titles are selected without names, or vice versa
    else if(divorced && ((chossonMotherTitle.value !== "" && chossonMotherTitle.value !== "Title") && chossonMotherName.value === "") || ((chossonMotherTitle.value === "" || chossonMotherTitle.value === "Title") && chossonMotherName.value !== "")) {
        showErrorModal("Please complete the Chosson's father's wife's full name and title")
    }
    else if(((chossonMotherHusbandTitle.value !== "" && chossonMotherHusbandTitle.value !== "Title") && chossonMotherHusbandName.value === "") || ((chossonMotherHusbandTitle.value === "" || chossonMotherHusbandTitle.value === "Title") && chossonMotherHusbandName.value !== "")) {
        showErrorModal("Please complete the Chosson's mother's husband's full name and title")
    }

    else if(chossonName.value !== "" && chossonOrigin.value !== "") {
        

        if(divorced2 === false) {
            formPopup.style.height = "450px"; // Adjustd the height accordingly
            divorcedButton.style.top = "260px"; // Adjust the top position accordingly
            deseasedButton.style.top = "260px"; // Adjust the top position accordingly
        }
        else {
            formPopup.style.height = "550px"; // Adjust the height accordingly
            divorcedButton.style.top = "355px"; // Adjust the top position accordingly
            deseasedButton.style.top = "355px"; // Adjust the top position accordingly
        }
        
    
    Form1.style.left = "-450px";
    Form2.style.left = "40px";
    progress.style.width = "325px";
    }
}

Back.onclick = function () {
    
    formPopup.style.height = "450px"; // Adjustd the height accordingly
    

    Form.style.left = "40px";
    Form1.style.left = "450px";
    progress.style.width = "100px";
}

Back1.onclick = function() {

    if(divorced) {
        formPopup.style.height = "550px"; // Adjust the height accordingly
        divorcedButton.style.top = "355px"; // Adjust the top position accordingly
        deseasedButton.style.top = "355px"; // Adjust the top position accordingly
    }
    else {
        formPopup.style.height = "450px"; // Adjustd the height accordingly
        divorcedButton.style.top = "260px"; // Adjust the top position accordingly
        deseasedButton.style.top = "260px"; // Adjust the top position accordingly
    }

    Form1.style.left = "40px";
    Form2.style.left = "450px";
    progress.style.width = "210px";
}

Next2.onclick = function() {

    // if(kallahName.value == "") {
    //     showErrorModal("Please enter the Kallah's name")
    // }
    // else if(kallahFatherTitle.value === "" || kallahFatherTitle.value === "Title" || kallahFather.value === "") {
    //     if(addParentKallahFatherTitle.value === "" || addParentKallahFatherTitle.value === "Title" || addParentKallahFatherName.value === "") {
    //     showErrorModal("Please enter the Kallah's father's full name")
    //     }
    // }
    // else if(kallahMotherTitle.value === "" || kallahMotherTitle.value === "Title" || kallahMother.value === "") {
    //     if(addParentKallahMotherTitle.value === "" || addParentKallahMotherTitle.value === "Title" || addParentKallahMotherName.value === "") {
    //     showErrorModal("Please enter the Kallah's mother's full name")
    //     }
    // }
    // else if(kallahOrigin.value !== "detroit" && kallahOrigin.value !== "other") {
    //     showErrorModal("Please enter where the kallah is from")
    // }
    // else if(kallahName.value !== "" && kallahOrigin.value !== "") {




        if(kallahName.value == "") {
            showErrorModal("Please enter the Kallah's name")
        }
        
        else if(kallahFatherTitle.value === "" || kallahFatherTitle.value === "Title" || kallahFatherName.value === "") {
            showErrorModal("Please enter the kallah's father's full name")
        }
    
    
        else if(divorced2 === false && (kallahMotherTitle.value === "" || kallahMotherTitle.value === "Title" || kallahMotherName.value === "")) {
            // if(kallahMotherDivorcedTitle.value === "" || kallahMotherDivorcedTitle.value === "Title" || kallahMotherDivorcedName.value === "") {
            showErrorModal("Please enter the kallah's mother's full name")
            // }
            // else if (kallahName.value !== "" && kallahOrigin.value !== ""){
            //     Form1.style.left = "-450px";
            //     Form2.style.left = "40px";
            //     progress.style.width = "325px";
            // }
        }
        else if(divorced2 === true && (kallahMotherDivorcedTitle.value === "" || kallahMotherDivorcedTitle.value === "Title" || kallahMotherDivorcedName.value === "")) {
            showErrorModal("Please enter the kallah's mother's full name")
        }
        else if(kallahOrigin.value !== "detroit" && kallahOrigin.value !== "other") {
            showErrorModal("Please enter where the kallah is from")
        }

        //check if any of the optional fields have titles are selected without names, or vice versa
        else if(divorced2 && ((kallahMotherTitle.value !== "" && kallahMotherTitle.value !== "Title") && kallahMotherName.value === "") || ((kallahMotherTitle.value === "" || kallahMotherTitle.value === "Title") && kallahMotherName.value !== "")) {
            showErrorModal("Please complete the kallah's father's wife's full name and title")
        }
        else if(((kallahMotherHusbandTitle.value !== "" && kallahMotherHusbandTitle.value !== "Title") && kallahMotherHusbandName.value === "") || ((kallahMotherHusbandTitle.value === "" || kallahMotherHusbandTitle.value === "Title") && kallahMotherHusbandName.value !== "")) {
            showErrorModal("Please complete the kallah's mother's husband's full name and title")
        }
    
        else if(kallahName.value !== "" && kallahOrigin.value !== "") {
            
    
                formPopup.style.height = "450px"; // Adjustd the height accordingly
                divorcedButton.style.top = "260px"; // Adjust the top position accordingly
                deseasedButton.style.top = "260px"; // Adjust the top position accordingly
           





    Form2.style.left = "-450px";
    Form3.style.left = "40px";
    progress.style.width = "450px";
    }
}

Back2.onclick = function() {

    if(divorced2) {
        formPopup.style.height = "550px"; // Adjust the height accordingly
        divorcedButton.style.top = "355px"; // Adjust the top position accordingly
        deseasedButton.style.top = "355px"; // Adjust the top position accordingly
    }
    else {
        formPopup.style.height = "450px"; // Adjustd the height accordingly
        divorcedButton.style.top = "260px"; // Adjust the top position accordingly
        deseasedButton.style.top = "260px"; // Adjust the top position accordingly
    }

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
  
  
