const searchBar = document.querySelector("#searchBar")
const chosson = document.getElementsByClassName("chosson")
const chossonArray = []
const kallah = document.getElementsByClassName("kallah")

// console.log(chosson[0].outerText)
for(let i = 0; i < chosson.length; i++){
    chossonArray.push(chosson[i].outerText)
}
// console.log(chossonArray[0].outerText)

console.log(chossonArray)
searchBar.addEventListener('keyup', (e) => {
    const searchString = e.target.value
    for(let i = 0; i < chossonArray.length; i++){
        if(chossonArray[i].includes(searchString)){
            console.log(chossonArray[i])
        }
    }
})




