<!DOCTYPE html>
<html>
<head>
    <title>Poker Hand Checker</title>
    <script>
        function getCardValue(card) {
            const values = {"2": 2, "3": 3, "4": 4, "5": 5, "6": 6, "7": 7, "8": 8, "9": 9, "T": 10, "J": 11, "Q": 12, "K": 13, "A": 14};
            return values[card[0]];
        }
        
        function checkWinner() {
            let hand1 = document.getElementById("hand1").value.trim().toUpperCase().split(" ");
            let hand2 = document.getElementById("hand2").value.trim().toUpperCase().split(" ");
            let hand3 = document.getElementById("hand3").value.trim().toUpperCase().split(" ");
            let tableCards = document.getElementById("tableCards").value.trim().toUpperCase().split(" ");
            
            if (tableCards.length !== 5) {
                alert("Please enter exactly five community cards.");
                return;
            }
            
            let hands = [];
            if (hand1.length === 2) hands.push({ name: "Hand 1", cards: hand1.concat(tableCards) });
            if (hand2.length === 2) hands.push({ name: "Hand 2", cards: hand2.concat(tableCards) });
            if (hand3.length === 2) hands.push({ name: "Hand 3", cards: hand3.concat(tableCards) });
            
            if (hands.length < 2) {
                alert("At least two hands must be entered to determine a winner.");
                return;
            }
            
            hands.forEach(hand => {
                hand.total = hand.cards.map(getCardValue).sort((a, b) => b - a).slice(0, 5).reduce((sum, val) => sum + val, 0);
            });
            
            hands.sort((a, b) => b.total - a.total);
            
            let winners = hands.filter(hand => hand.total === hands[0].total).map(hand => hand.name);
            
            let result = winners.length > 1 ? "It's a Tie between " + winners.join(" and ") + "!" : winners[0] + " Wins!";
            
            document.getElementById("result").innerText = result;
        }
    </script>
</head>
<body>
    <h2>Poker Hand Checker</h2>
    <p>Enter two-card hands for each player (optional if folded) and five community cards (e.g., "AH KH" for Ace and King of Hearts, "2D 5S 9C JD QH" for the table):</p>
    <input type="text" id="hand1" placeholder="Hand 1 (e.g., AH KH)">
    <input type="text" id="hand2" placeholder="Hand 2 (e.g., QD JD)">
    <input type="text" id="hand3" placeholder="Hand 3 (e.g., 9S 8H)">
    <input type="text" id="tableCards" placeholder="Table Cards (e.g., 2D 5S 9C JD QH)">
    <button onclick="checkWinner()">Check Winner</button>
    <p id="result"></p>
</body>
</html>
