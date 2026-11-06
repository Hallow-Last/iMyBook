class BookStorage {
// Shared Local Storage for 2 pages
    getBooks(){
        try {
            let savedData = localStorage.getItem("myBooks")
            if (savedData === null){
                return []
            }
            let books = JSON.parse(savedData)
            if (Array.isArray(books) === false){
                throw new Error("The saved reading list is not an array.")
            }
            for (let i = 0; i < books.length; i++){
                let book = books[i]
                if (book === null || typeof book !== "object" ||
                    typeof book.id !== "string" || book.id.trim() === "" ||
                    typeof book.title !== "string"){
                    throw new Error("A saved book record is invalid.")
                }
            }
            return books
        }
        catch (error){
            alert("Unable to read your saved books. Your stored data has not been replaced.")
            console.log(error)
            return null
        }
    }

    storeBooks(books){
        try {
            let savedData = JSON.stringify(books)
            localStorage.setItem("myBooks", savedData)
            return true
        }
        catch (error){
            alert("Unable to save changes. Please try again.")
            console.log(error)
            return false
        }
    }

    storeRecommendations(books, genre){
        let smallBooks = []
        for (let i = 0; i < books.length; i++){
            let book = books[i]
            smallBooks.push({
                key: book.key,
                title: book.title,
                author_name: book.author_name,
                first_publish_year: book.first_publish_year,
                edition_count: book.edition_count,
                subject: book.subject
            })
        }
        try {
            localStorage.setItem("myRecommendations", JSON.stringify({
                genre: genre,
                books: smallBooks
            }))
            return true
        }
        catch (error){
            console.error("Could not save recommendations", error)
            return false
        }
    }

    getRecommendations(){
        try {
            let saved = localStorage.getItem("myRecommendations")
            if (saved === null){
                return null
            }
            let data = JSON.parse(saved)
            if (data === null || typeof data.genre !== "string" ||
                Array.isArray(data.books) === false){
                return null
            }
            for (let i = 0; i < data.books.length; i++){
                let book = data.books[i]
                if (book === null || typeof book.key !== "string" ||
                    typeof book.title !== "string"){
                    return null
                }
            }
            return data
        }
        catch (error){
            console.error("Could not read saved recommendations", error)
            return null
        }
    }

}

const bookStorage = new BookStorage()


// Shared display methods used by both pages for information for Discover, My Library and roulette.
class BookDetails {
    constructor(){
        this.descriptionCache = []
    }

    addedDateText(book, now){
        if (typeof book.addedAt !== "string" || book.addedAt.trim() === ""){
            return "Added date not recorded"
        }
        let addedTime = Date.parse(book.addedAt)
        if (Number.isFinite(addedTime) === false || addedTime > now){
            return "Added date not recorded"
        }
        let addedDate = new Date(addedTime)
        let currentDate = new Date(now)
        let addedDay = Date.UTC(addedDate.getFullYear(), addedDate.getMonth(), addedDate.getDate())
        let currentDay = Date.UTC(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate())
        let daysAgo = Math.round((currentDay - addedDay) / 86400000)
        let relativeDate = daysAgo + " days ago"
        if (daysAgo === 0){
            relativeDate = "today"
        }
        else if (daysAgo === 1){
            relativeDate = "yesterday"
        }
        let dateLabel = addedDate.toLocaleDateString("en-GB", {
            day: "numeric", month: "short", year: "numeric"
        })
        return "Added " + dateLabel + " · " + relativeDate
    }

    displayAddedDate(book, container){
        let added = document.createElement("p")
        added.className = "book-added-date"
        added.textContent = this.addedDateText(book, Date.now())
        container.appendChild(added)
    }

    displaySavedProgress(book, container){
        let reminder = document.createElement("div")
        reminder.className = "saved-progress-reminder"
        let status = document.createElement("p")
        status.className = "saved-progress-status"
        if (book.status === "completed"){
            status.textContent = "In your library · Completed"
        }
        else if (book.status === "reading"){
            status.textContent = "In your library · Currently reading"
        }
        else {
            status.textContent = "In your library · Want to read"
        }
        reminder.appendChild(status)
        this.displayAddedDate(book, reminder)

        let progressText = document.createElement("p")
        let validProgress = false
        if (Number.isInteger(book.totalPages) && book.totalPages > 0 &&
            Number.isInteger(book.pagesRead) && book.pagesRead >= 0 &&
            book.pagesRead <= book.totalPages){
            validProgress = true
        }
        if (validProgress === true){
            let percentage = book.pagesRead / book.totalPages * 100
            progressText.textContent = book.pagesRead + " / " + book.totalPages +
                " pages · " + percentage.toFixed(1) + "% completed"
            reminder.appendChild(progressText)
            let bar = document.createElement("div")
            bar.className = "progress-bar"
            let fill = document.createElement("div")
            fill.className = "progress-fill"
            fill.style.width = percentage + "%"
            bar.appendChild(fill)
            reminder.appendChild(bar)
        }
        else {
            progressText.textContent = "No page progress recorded yet."
            reminder.appendChild(progressText)
        }
        container.appendChild(reminder)
    }

    descriptionText(data){
        let text = ""

        if (data !== null && typeof data === "object"){

            if (typeof data.description === "string"){
                text = data.description
            }

            else if (data.description !== null &&
                    typeof data.description === "object" &&
                    typeof data.description.value === "string"){

                text = data.description.value
            }
        }

        // Convert HTML descriptions into readable text
        const parser = new DOMParser()
        const html = parser.parseFromString(text, "text/html")

        html.querySelectorAll("script, style, iframe").forEach(function(element){
            element.remove()
        })
        return (html.body.textContent || "").replace(/\s+/g, " ").trim()
    }

    async fetchDescription(bookId){
        if (typeof bookId !== "string" || /^\/works\/OL[0-9]+W$/.test(bookId) === false){
            return "No description available for this book."
        }
        for (let i = 0; i < this.descriptionCache.length; i++){
            if (this.descriptionCache[i].id === bookId){
                return this.descriptionCache[i].text
            }
        }
        let controller = new AbortController()
        let timeout = setTimeout(function(){
            controller.abort()
        }, 30000)
        try {
            let response = await fetch("https://openlibrary.org" + bookId + ".json", {
                signal: controller.signal
            })
            if (response.ok === false){
                let error = new Error("Open Library returned HTTP " + response.status)
                error.status = response.status
                throw error
            }
            let data = await response.json()
            let text = this.descriptionText(data)
            if (text === ""){
                text = "No description available for this book."
            }
            this.descriptionCache.push({id: bookId, text: text})
            return text
        }
        finally {
            clearTimeout(timeout)
        }
    }

    displayDescription(bookId, container){
        let details = document.createElement("details")
        details.className = "book-description"
        let summary = document.createElement("summary")
        summary.textContent = "Read description"
        details.appendChild(summary)
        let text = document.createElement("p")
        text.className = "book-description-text"
        text.setAttribute("aria-live", "polite")
        details.appendChild(text)
        let source = document.createElement("p")
        source.className = "description-source"
        source.textContent = "Description from Open Library"
        source.hidden = true
        details.appendChild(source)

        let retry = document.createElement("button")
        retry.type = "button"
        retry.className = "progress-btn"
        retry.textContent = "Retry description"
        retry.hidden = true
        details.appendChild(retry)

        let state = {loaded: false, loading: false}
        let currentDetails = this
        details.addEventListener("toggle", async function(){
            if (details.open === false || state.loaded === true || state.loading === true){
                return
            }
            await currentDetails.loadDescription(bookId, text, source, retry, state)
        })
        retry.addEventListener("click", async function(){
            await currentDetails.loadDescription(bookId, text, source, retry, state)
        })
        container.appendChild(details)
    }

    async loadDescription(bookId, text, source, retry, state){
        if (state.loading === true){
            return
        }
        state.loading = true
        retry.hidden = true
        source.hidden = true
        text.textContent = "Loading description..."
        try {
            text.textContent = await this.fetchDescription(bookId)
            state.loaded = true
            if (text.textContent !== "No description available for this book."){
                source.hidden = false
            }
        }
        catch (error){
            state.loaded = false
            if (error.name === "AbortError"){
                text.textContent = "Open Library did not respond within 30 seconds. Please try again."
            }
            else if (error.status === 429){
                text.textContent = "Open Library is limiting requests (HTTP 429). Please wait a little before retrying."
            }
            else if (error.status === 404){
                text.textContent = "This book's description record could not be found (HTTP 404)."
            }
            else if (typeof error.status === "number"){
                text.textContent = "The description service returned HTTP " + error.status + ". Please try again later."
            }
            else if (error.name === "SyntaxError"){
                text.textContent = "Open Library returned an unreadable response. Please try again."
            }
            else {
                text.textContent = "Unable to reach the description service. Please retry."
            }
            console.error("Description request failed for " + bookId, error)
            retry.hidden = false
        }
        finally {
            state.loading = false
        }
    }

}

const bookDetails = new BookDetails()
