document.addEventListener('DOMContentLoaded', function () {
    const form = document.getElementById('journalForm');
    const status = document.getElementById('status');

    form.addEventListener('submit', function (e) {
        e.preventDefault();
        status.textContent = "Saving...";

        const formData = new FormData(form);

        fetch("https://script.google.com/macros/s/AKfycbw6wCt4bmL2qx_mqKrbyAKa7Q9cAgnep3NCNTu49UZtkeopoSUZufVikC5ozo7XUi24/exec", {
            method: "POST",
            body: formData
        })
        .then(res => res.text())
        .then(text => {
            status.textContent = "Saved successfully!";
            form.reset();
            loadJournalData(); // reload table
        })
        .catch(err => {
            console.error(err);
            status.textContent = "Error saving entry.";
        });
    });

    loadJournalData();

    function loadJournalData() {
        fetch("https://script.google.com/macros/s/AKfycbw6wCt4bmL2qx_mqKrbyAKa7Q9cAgnep3NCNTu49UZtkeopoSUZufVikC5ozo7XUi24/exec")
        .then(res => res.json())
        .then(data => {
            const tableBody = document.querySelector("#journalTable tbody");
            tableBody.innerHTML = "";
            data.forEach(row => {
                const tr = document.createElement("tr");
                row.forEach(cell => {
                    const td = document.createElement("td");
                    td.textContent = cell;
                    tr.appendChild(td);
                });
                tableBody.appendChild(tr);
            });
        })
        .catch(err => console.error(err));
    }
});
