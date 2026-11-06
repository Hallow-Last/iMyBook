// Each roulette object keeps its previous suggestion and screen elements.
class BacklogRoulette {
    constructor(){
        this.rouletteButton = document.getElementById("rouletteButton")
        this.rouletteResult = document.getElementById("rouletteResult")
        this.previousBookId = null
    }

    validBookDate(value, today){
        if (typeof value !== "string" || value.trim() === ""){
            return false
        }
        let time = Date.parse(value)
        if (Number.isFinite(time) === false || time > today){
            return false
        }
        return true
    }

    calculateBookWeight(book, today){
        let activityDate = null
        let dateSource = "No recorded date; starting weight used."
        if (this.validBookDate(book.lastReadAt, today) === true){
            activityDate = book.lastReadAt
            dateSource = "Since your last reading progress change"
        }
        else if (this.validBookDate(book.addedAt, today) === true){
            activityDate = book.addedAt
            dateSource = "Since this book was added"
        }

        let daysInactive = 0
        if (activityDate !== null){
            let millisecondsInactive = today - Date.parse(activityDate)
            let millisecondsPerDay = 24 * 60 * 60 * 1000
            daysInactive = Math.floor(millisecondsInactive / millisecondsPerDay)
        }

        let weight = 1 + daysInactive
        return {book: book, daysInactive: daysInactive, weight: weight,
            dateSource: dateSource, hasDate: activityDate !== null}
    }

    prepareRoulette(books, previousId, today){
        let eligibleBooks = []
        for (let i = 0; i < books.length; i++){
            let book = books[i]
            let finishedPages = false
            if (Number.isInteger(book.totalPages) && book.totalPages > 0 &&
                Number.isInteger(book.pagesRead) && book.pagesRead >= book.totalPages){
                finishedPages = true
            }
            if ((book.status === "want" || book.status === "reading") &&
                finishedPages === false){
                eligibleBooks.push(book)
            }
        }

        let entries = []
        let totalWeight = 0
        for (let i = 0; i < eligibleBooks.length; i++){
            let book = eligibleBooks[i]
            if (eligibleBooks.length > 1 && book.id === previousId){
                continue
            }
            let entry = this.calculateBookWeight(book, today)
            entries.push(entry)
            totalWeight = totalWeight + entry.weight
        }
        return {entries: entries, totalWeight: totalWeight}
    }

    selectRouletteEntry(draw, randomValue){
        if (draw.entries.length === 0 || Number.isFinite(draw.totalWeight) === false ||
            draw.totalWeight <= 0 || Number.isFinite(randomValue) === false ||
            randomValue < 0 || randomValue >= 1){
            return null
        }
        let randomPoint = randomValue * draw.totalWeight
        let runningTotal = 0
        for (let i = 0; i < draw.entries.length; i++){
            runningTotal = runningTotal + draw.entries[i].weight
            if (randomPoint < runningTotal){
                return draw.entries[i]
            }
        }
        return draw.entries[draw.entries.length - 1]
    }

    resetRoulette(){
        this.previousBookId = null
        this.rouletteResult.textContent = ""
        this.rouletteButton.textContent = "Rediscover a Book"
    }

    drawBook(){
        let books = bookStorage.getBooks()
        if (books === null){
            return
        }
        let today = Date.now()
        let draw = this.prepareRoulette(books, this.previousBookId, today)
        let selected = this.selectRouletteEntry(draw, Math.random())
        this.rouletteResult.textContent = ""
        if (selected === null){
            this.rouletteResult.textContent = "No unfinished books available. Add a book from Discover or check its reading status."
            this.rouletteButton.textContent = "Rediscover a Book"
            this.previousBookId = null
            return
        }

        let card = document.createElement("div")
        card.className = "roulette-book"

        let cover = document.createElement("img")
        cover.src = "assets/book-cover.png"
        cover.alt = "iMyBook custom collection cover"
        cover.className = "roulette-cover"
        card.appendChild(cover)

        let information = document.createElement("div")
        information.className = "roulette-book-information"

        let label = document.createElement("p")
        label.className = "roulette-result-label"
        label.textContent = "YOUR NEXT READ?"
        information.appendChild(label)

        let title = document.createElement("h3")
        title.textContent = selected.book.title
        information.appendChild(title)

        let author = document.createElement("p")
        author.className = "roulette-author"
        author.textContent = "By " + selected.book.author
        information.appendChild(author)
        bookDetails.displaySavedProgress(selected.book, information)
        bookDetails.displayDescription(selected.book.id, information)
        card.appendChild(information)

        let chance = (selected.weight / draw.totalWeight) * 100
        let probability = document.createElement("div")
        probability.className = "roulette-chance"
        let percentage = document.createElement("strong")
        percentage.textContent = chance.toFixed(1) + "%"
        probability.appendChild(percentage)
        let chanceLabel = document.createElement("span")
        chanceLabel.textContent = "chance this draw"
        probability.appendChild(chanceLabel)
        card.appendChild(probability)
        this.rouletteResult.appendChild(card)

    
        let details = document.createElement("details")
        details.className = "roulette-details"
        let summary = document.createElement("summary")
        summary.textContent = "How this was picked"
        details.appendChild(summary)

        let reason = document.createElement("p")
        if (selected.hasDate === true){
            reason.textContent = selected.dateSource + ": " + selected.daysInactive + " days."
        }
        else {
            reason.textContent = "This book has no saved activity date yet, so it starts with weight 1."
        }
        details.appendChild(reason)

        let explanation = document.createElement("p")
        explanation.textContent = "Selection chance = " + selected.weight + " / " +
            draw.totalWeight + " × 100 = " + chance.toFixed(1) + "% (book weight / total draw weight)."
        details.appendChild(explanation)

        let note = document.createElement("p")
        note.textContent = "Drawing a book does not change your reading progress."
        if (this.previousBookId !== null && books.length > 1){
            note.textContent = "The previous suggestion is left out when alternatives exist. Your reading progress stays unchanged."
        }
        details.appendChild(note)
        this.rouletteResult.appendChild(details)
        this.previousBookId = selected.book.id
        this.rouletteButton.textContent = "Show Another"
    }


}

const roulette = new BacklogRoulette()
roulette.rouletteButton.addEventListener("click", function(){
    roulette.drawBook()
})
