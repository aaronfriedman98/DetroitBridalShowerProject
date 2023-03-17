const bakeware = document.querySelector("#bakewarePopup")
const bath = document.querySelector("#bathPopup")
const bedding = document.querySelector("#beddingPopup")
const cookware = document.querySelector("#cookwarePopup")
const dinnerware = document.querySelector("#dinnerwarePopup")
const drinkware = document.querySelector("#drinkwarePopup")
const funiture = document.querySelector("#furniturePopup")
const home = document.querySelector("#homePopup")
const serveware = document.querySelector("#servewarePopup")
const shabbos = document.querySelector("#shabbosPopup")
const smallAppliance = document.querySelector("#smallAppliancePopup")
const storageOrganization = document.querySelector("#storageOrganizationPopup")


bakeware.addEventListener('click',showPopupBakeware)
bath.addEventListener('click',showPopupBath)
bedding.addEventListener('click',showPopupBedding)
cookware.addEventListener('click',showPopupCookware)
dinnerware.addEventListener('click',showPopupDinnerware)
drinkware.addEventListener('click',showPopupDrinkware)
funiture.addEventListener('click',showPopupFurniture)
home.addEventListener('click',showPopupHome)
serveware.addEventListener('click',showPopupServeware)
shabbos.addEventListener('click',showPopupShabbos)
smallAppliance.addEventListener('click',showPopupSmallAppliance)
storageOrganization.addEventListener('click',showPopupStorageOrganization)



function showPopupBakeware() {
    document.querySelector(".bakeware").classList.add("reveal")
}
function showPopupBath() {
    document.querySelector(".bath").classList.add("reveal")
}
function showPopupBedding() {
    document.querySelector(".bedding").classList.add("reveal")
}
function showPopupCookware() {
    document.querySelector(".cookware").classList.add("reveal")
}
function showPopupDinnerware() {
    document.querySelector(".dinnerware").classList.add("reveal")
}
function showPopupDrinkware() {
    document.querySelector(".drinkware").classList.add("reveal")
}
function showPopupFurniture() {
    document.querySelector(".furniture").classList.add("reveal")
}
function showPopupHome() {
    document.querySelector(".home").classList.add("reveal")
}
function showPopupServeware() {
    document.querySelector(".serveware").classList.add("reveal")
}
function showPopupShabbos() {
    document.querySelector(".shabbos").classList.add("reveal")
}
function showPopupSmallAppliance() {
    document.querySelector(".smallAppliance").classList.add("reveal")
}
function showPopupStorageOrganization() {
    document.querySelector(".storageOrganization").classList.add("reveal")
}




document.querySelector(".btnBakeware").addEventListener('click',closePopupBakeware)
document.querySelector(".btnBath").addEventListener('click',closePopupBath)
document.querySelector(".btnBedding").addEventListener('click',closePopupBedding)
document.querySelector(".btnCookware").addEventListener('click',closePopupCookware)
document.querySelector(".btnDinnerware").addEventListener('click',closePopupDinnerware)
document.querySelector(".btnDrinkware").addEventListener('click',closePopupDrinkware)
document.querySelector(".btnFurniture").addEventListener('click',closePopupFurniture)
document.querySelector(".btnHome").addEventListener('click',closePopupHome)
document.querySelector(".btnServeware").addEventListener('click',closePopupServeware)
document.querySelector(".btnShabbos").addEventListener('click',closePopupShabbos)
document.querySelector(".btnSmallAppliance").addEventListener('click',closePopupSmallAppliance)
document.querySelector(".btnStorageOrganization").addEventListener('click',closePopupStorageOrganization)

function closePopupBakeware() {
    document.querySelector(".bakeware").classList.remove("reveal")
}

function closePopupBath() {
    document.querySelector(".bath").classList.remove("reveal")
}

function closePopupBedding() {
    document.querySelector(".bedding").classList.remove("reveal")
}

function closePopupCookware() {
    document.querySelector(".cookware").classList.remove("reveal")
}

function closePopupDinnerware() {
    document.querySelector(".dinnerware").classList.remove("reveal")
}

function closePopupDrinkware() {
    document.querySelector(".drinkware").classList.remove("reveal")
}
function closePopupFurniture() {
    document.querySelector(".furniture").classList.remove("reveal")
}

function closePopupHome() {
    document.querySelector(".home").classList.remove("reveal")
}

function closePopupServeware() {
    document.querySelector(".serveware").classList.remove("reveal")
}
function closePopupShabbos() {
    document.querySelector(".shabbos").classList.remove("reveal")
}

function closePopupSmallAppliance() {
    document.querySelector(".smallAppliance").classList.remove("reveal")
}

function closePopupStorageOrganization() {
    document.querySelector(".storageOrganization").classList.remove("reveal")
}



document.querySelector(".leftBath").addEventListener('click',leftBath)
document.querySelector(".leftBedding").addEventListener('click',leftBedding)
document.querySelector(".leftCookware").addEventListener('click',leftCookware)
document.querySelector(".leftDinnerware").addEventListener('click',leftDinnerware)
document.querySelector(".leftDrinkware").addEventListener('click',leftDrinkware)
document.querySelector(".leftFurniture").addEventListener('click',leftFurniture)
document.querySelector(".leftHome").addEventListener('click',leftHome)
document.querySelector(".leftServeware").addEventListener('click',leftServeware)
document.querySelector(".leftShabbos").addEventListener('click',leftShabbos)
document.querySelector(".leftSmallAppliance").addEventListener('click',leftSmallAppliance)
document.querySelector(".leftStorageOrganization").addEventListener('click',leftStorageOrganization)


function leftBath() {
    document.querySelector(".bath").classList.remove("reveal")
    document.querySelector(".bakeware").classList.add("reveal")
}

function leftBedding() {
    document.querySelector(".bedding").classList.remove("reveal")
    document.querySelector(".bath").classList.add("reveal")
}

function leftCookware() {
    document.querySelector(".cookware").classList.remove("reveal")
    document.querySelector(".bedding").classList.add("reveal")
}

function leftDinnerware() {
    document.querySelector(".dinnerware").classList.remove("reveal")
    document.querySelector(".cookware").classList.add("reveal")
}

function leftDrinkware() {
    document.querySelector(".drinkware").classList.remove("reveal")
    document.querySelector(".dinnerware").classList.add("reveal")
}

function leftFurniture() {
    document.querySelector(".furniture").classList.remove("reveal")
    document.querySelector(".drinkware").classList.add("reveal")
}

function leftHome() {
    document.querySelector(".home").classList.remove("reveal")
    document.querySelector(".furniture").classList.add("reveal")
}

function leftServeware() {
    document.querySelector(".serveware").classList.remove("reveal")
    document.querySelector(".home").classList.add("reveal")
}

function leftShabbos() {
    document.querySelector(".shabbos").classList.remove("reveal")
    document.querySelector(".serveware").classList.add("reveal")
}

function leftSmallAppliance() {
    document.querySelector(".smallAppliance").classList.remove("reveal")
    document.querySelector(".shabbos").classList.add("reveal")
}

function leftStorageOrganization() {
    document.querySelector(".storageOrganization").classList.remove("reveal")
    document.querySelector(".smallAppliance").classList.add("reveal")
}


document.querySelector(".rightBakeware").addEventListener('click',rightBakeware)
document.querySelector(".rightBath").addEventListener('click',rightBath)
document.querySelector(".rightBedding").addEventListener('click',rightBedding)
document.querySelector(".rightCookware").addEventListener('click',rightCookware)
document.querySelector(".rightDinnerware").addEventListener('click',rightDinnerware)
document.querySelector(".rightDrinkware").addEventListener('click',rightDrinkware)
document.querySelector(".rightFurniture").addEventListener('click',rightFurniture)
document.querySelector(".rightHome").addEventListener('click',rightHome)
document.querySelector(".rightServeware").addEventListener('click',rightServeware)
document.querySelector(".rightShabbos").addEventListener('click',rightShabbos)
document.querySelector(".rightSmallAppliance").addEventListener('click',rightSmallAppliance)


function rightBakeware() {
    document.querySelector(".bakeware").classList.remove("reveal")
    document.querySelector(".bath").classList.add("reveal")
}

function rightBath() {
    document.querySelector(".bath").classList.remove("reveal")
    document.querySelector(".bedding").classList.add("reveal")
}

function rightBedding() {
    document.querySelector(".bedding").classList.remove("reveal")
    document.querySelector(".cookware").classList.add("reveal")
}

function rightCookware() {
    document.querySelector(".cookware").classList.remove("reveal")
    document.querySelector(".dinnerware").classList.add("reveal")
}

function rightDinnerware() {
    document.querySelector(".dinnerware").classList.remove("reveal")
    document.querySelector(".drinkware").classList.add("reveal")
}

function rightDrinkware() {
    document.querySelector(".drinkware").classList.remove("reveal")
    document.querySelector(".furniture").classList.add("reveal")
}

function rightFurniture() {
    document.querySelector(".furniture").classList.remove("reveal")
    document.querySelector(".home").classList.add("reveal")
}

function rightHome() {
    document.querySelector(".home").classList.remove("reveal")
    document.querySelector(".serveware").classList.add("reveal")
}

function rightServeware() {
    document.querySelector(".serveware").classList.remove("reveal")
    document.querySelector(".shabbos").classList.add("reveal")
}

function rightShabbos() {
    document.querySelector(".shabbos").classList.remove("reveal")
    document.querySelector(".smallAppliance").classList.add("reveal")
}

function rightSmallAppliance() {
    document.querySelector(".smallAppliance").classList.remove("reveal")
    document.querySelector(".storageOrganization").classList.add("reveal")
}

const guide = document.querySelector('#guide')

guide.addEventListener("click", function() {
    document.querySelector(".container").style.visibility = 'visible'
})