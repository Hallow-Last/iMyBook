class LibraryPage {
    constructor(){
        this.savedBooksDiv = document.getElementById("savedBooks")
        this.statusFilter = document.getElementById("statusFilter")
    }


    displaySavedBooks(){

        let books = bookStorage.getBooks()
        if (books === null){
            return
        }
        let filter = this.statusFilter.value

        this.savedBooksDiv.textContent = ""

        let totalDisplayed = 0

        for (let i = 0; i < books.length; i++){

            let book = books[i]

            if (filter === "all" || book.status === filter){

                totalDisplayed++

                // Create Book Card
                let card = document.createElement("div")
                card.className = "book-card"

                card.id = book.id

                // Local custom cover, shared by every book.
                let cover = document.createElement("img")
                cover.src = "assets/book-cover.png"
                cover.className = "book-cover"
                cover.alt = "iMyBook custom collection cover"
                card.appendChild(cover)

                // Book Information
                let info = document.createElement("div")
                info.className = "book-info"

                let title = document.createElement("h3")
                title.className = "book-title"
                title.textContent = book.title
                info.appendChild(title)

                let author = document.createElement("p")
                author.textContent = "By " + book.author
                info.appendChild(author)

                let year = document.createElement("p")
                year.textContent = "Published: " + book.year
                info.appendChild(year)
                bookDetails.displayAddedDate(book, info)
                bookDetails.displayDescription(book.id, info)


                
                // Reading Status
               

                let statusLabel = document.createElement("label")
                statusLabel.textContent = "Reading Status"
                info.appendChild(statusLabel)

                let statusSelect = document.createElement("select")

                let option1 = document.createElement("option")
                option1.value = "want"
                option1.textContent = "Want to Read"

                let option2 = document.createElement("option")
                option2.value = "reading"
                option2.textContent = "Currently Reading"

                let option3 = document.createElement("option")
                option3.value = "completed"
                option3.textContent = "Completed"

                statusSelect.appendChild(option1)
                statusSelect.appendChild(option2)
                statusSelect.appendChild(option3)

                statusSelect.value = book.status

                statusSelect.addEventListener("change", function(){
                    libraryPage.updateBook(book.id, statusSelect.value)
                })

                info.appendChild(statusSelect)


                

                // Total Pages
                let totalLabel = document.createElement("label")
                totalLabel.textContent = "Total Pages"
                info.appendChild(totalLabel)

                let totalInput = document.createElement("input")
                totalInput.type = "number"
                totalInput.min = "1"
                totalInput.placeholder = "Enter total pages"
                if (book.totalPages > 0){
                    totalInput.value = book.totalPages
                }

                info.appendChild(totalInput)

                let readLabel = document.createElement("label")
                readLabel.textContent = "Pages Read"
                info.appendChild(readLabel)

                let readInput = document.createElement("input")
                readInput.type = "number"
                readInput.min = "0"
                readInput.placeholder = "Enter pages read"

                if (book.totalPages > 0){
                    readInput.value = book.pagesRead
                }

                info.appendChild(readInput)
                let progressBtn = document.createElement("button")
                progressBtn.className = "progress-btn"
                progressBtn.textContent = "Save Progress"

                progressBtn.addEventListener("click", function(){

                    let total = totalInput.value
                    let read = readInput.value

                    libraryPage.updateProgress(book.id, total, read)
                })

                info.appendChild(progressBtn)

             
                if (book.totalPages > 0){

                    let pagesRead = Number(book.pagesRead)

                    let progress = (pagesRead / book.totalPages) * 100


                    let remaining = book.totalPages - pagesRead

                    let progressText = document.createElement("p")
                    progressText.className = "progress-text"

                    progressText.textContent =
                        "Reading Progress: " + progress.toFixed(1) + "%"

                    info.appendChild(progressText)

                    let progressBar = document.createElement("div")
                    progressBar.className = "progress-bar"

                    let progressFill = document.createElement("div")
                    progressFill.className = "progress-fill"
                    progressFill.style.width = progress + "%"

                    progressBar.appendChild(progressFill)
                    info.appendChild(progressBar)
                    let remainingText = document.createElement("p")

                    remainingText.textContent =
                        remaining + " pages remaining"

                    info.appendChild(remainingText)
                }

                let deleteBtn = document.createElement("button")
                deleteBtn.className = "delete-btn"
                deleteBtn.textContent = "Remove Book"

                deleteBtn.addEventListener("click", function(){
                    libraryPage.deleteBook(book.id)
                })

                info.appendChild(deleteBtn)

                card.appendChild(info)
                this.savedBooksDiv.appendChild(card)
            }
        }
        if (totalDisplayed === 0){

            let message = document.createElement("p")
            message.className = "empty-message"
            message.textContent = "No books found in your library."

            this.savedBooksDiv.appendChild(message)
        }
    }


    updateBook(id, newStatus){
        if (newStatus !== "want" && newStatus !== "reading" && newStatus !== "completed"){
            alert("Please choose a valid reading status.")
            return
        }

        let books = bookStorage.getBooks()
        if (books === null){
            return
        }
        let found = false

        for (let i = 0; i < books.length; i++){

            if (books[i].id === id){

                books[i].status = newStatus
                found = true
                break
            }
        }

        if (found === true){

            if (bookStorage.storeBooks(books) === false){
                return
            }

            alert("Reading status updated!")
            roulette.resetRoulette()
            this.displaySavedBooks()

        }
        else {

            alert("Book not found.")
        }
    }




    updateProgress(id, total, read){

        if (total.trim() === "" || read.trim() === ""){

            alert("Please enter total pages and pages read.")
            return
        }

        let totalPages = Number(total)
        let pagesRead = Number(read)

        if (!Number.isInteger(totalPages) ||
            !Number.isInteger(pagesRead) ||
            totalPages <= 0 ||
            pagesRead < 0){

            alert("Please enter valid whole numbers.")
            return
        }

        if (pagesRead > totalPages){

            alert("Pages read cannot exceed total pages.")
            return
        }

        let books = bookStorage.getBooks()
        if (books === null){
            return
        }
        let found = false

        for (let i = 0; i < books.length; i++){

            if (books[i].id === id){

                if (books[i].pagesRead !== pagesRead){
                    books[i].lastReadAt = new Date().toISOString()
                }

                books[i].totalPages = totalPages
                books[i].pagesRead = pagesRead

                found = true
                break
            }
        }

        if (found === true){

            if (bookStorage.storeBooks(books) === false){
                return
            }

            alert("Reading progress saved successfully!")

            roulette.resetRoulette()
            this.displaySavedBooks()

        }
        else {

            alert("Book not found.")
        }
    }

    deleteBook(id){

        let answer = confirm(
            "Are you sure you want to remove this book?"
        )

        if (answer === false){
            return
        }

        let books = bookStorage.getBooks()
        if (books === null){
            return
        }
        let updatedBooks = []
        let found = false

        for (let i = 0; i < books.length; i++){

            if (books[i].id !== id){

                updatedBooks.push(books[i])

            }
            else {

                found = true
            }
        }

        if (found === true){

            if (bookStorage.storeBooks(updatedBooks) === false){
                return
            }

            alert("Book removed successfully!")

            roulette.resetRoulette()
            this.displaySavedBooks()

        }
        else {

            alert("Book not found.")
        }
    }


}

const libraryPage = new LibraryPage()
libraryPage.statusFilter.addEventListener("change", function(){
    libraryPage.displaySavedBooks()
})
libraryPage.displaySavedBooks()
