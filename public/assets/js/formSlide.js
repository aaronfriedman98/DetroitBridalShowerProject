const Form1 = document.querySelector("#Form1")
const Form2 = document.querySelector("#Form2")
const Form3 = document.querySelector("#Form3")

const Next1 = document.querySelector("#Next1")
const Next2 = document.querySelector("#Next2")
const Back1 = document.querySelector("#Back1")
const Back2 = document.querySelector("#Back2")

const progress = document.querySelector("#progress")

Next1.onclick = function() {
    Form1.style.left = "-450px";
    Form2.style.left = "40px";
    progress.style.width = "300px";
}

Back1.onclick = function() {
    Form1.style.left = "40px";
    Form2.style.left = "450px";
    progress.style.width = "150px";
}

Next2.onclick = function() {
    Form2.style.left = "-450px";
    Form3.style.left = "40px";
    progress.style.width = "450px";
}

Back2.onclick = function() {
    Form2.style.left = "40px";
    Form3.style.left = "450px";
    progress.style.width = "300px";
}


document.querySelector('.input-selector').addEventListener('click',()=>{
document.querySelector('.list').classList.toggle('show')
})
document.querySelector('.close-btn').addEventListener('click',()=>{
    document.querySelector('.list').classList.remove('show')
    })




document.querySelector("#showForm").addEventListener("click", function() {
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