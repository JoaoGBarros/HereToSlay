
function ChallengeResult(playersData: any) {
     return (
        <div className="order-selection-scoreboard">
            <h3>Placar de Ordem</h3>
            <table>
                <thead>
                    <tr>
                        <th>Jogador</th>
                        <th>Rolagem</th>
                    </tr>
                </thead>
                <tbody>
                    {Object.values(playersData).map((player: any) => (
                        <tr key={player.id}>
                            <td>{player.username}</td>
                            <td>{player.orderRoll !== null && player.orderRoll !== undefined ? player.orderRoll : '-'}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

export default ChallengeResult;