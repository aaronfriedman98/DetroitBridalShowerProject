let navLinks = document.getElementById("navLinks");
const sortDown = document.querySelector(".sortDownContainer")

function showMenu() {
    navLinks.style.right = "0";
}

function hideMenu() {
    navLinks.style.right = "-200px";
}


dropdown = document.querySelector(".drop")
document.querySelector('.dropDown').addEventListener('mouseover',revealDropdown)
dropdown.addEventListener('mouseover',revealDropdown)
document.querySelector('.dropDown').addEventListener('mouseout',hideDropdown)
dropdown.addEventListener('mouseout',hideDropdown)


function revealDropdown() {
    document.querySelector('.dropDown').classList.add("dropDownReveal")
    sortDown.classList.add("rotate")
}
function hideDropdown() {
    document.querySelector('.dropDown').classList.remove("dropDownReveal")
    sortDown.classList.remove("rotate")
}

