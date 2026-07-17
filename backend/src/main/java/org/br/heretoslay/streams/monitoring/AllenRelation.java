package org.br.heretoslay.streams.monitoring;

/**
 * As 13 relações da álgebra de intervalos de Allen, usadas para classificar
 * como as sequências de sorte de dois jogadores se relacionam no tempo.
 * Esta enumeração implementa a (Reviravolta de Sorte), permitindo
 * detectar momentos nos quais a sorte de um jogador muda enquanto outro jogador
 * ainda está em uma sequência oposta.
 */
public enum AllenRelation {
    /** A termina antes de B começar */
    BEFORE,
    /** A termina exatamente quando B começa */
    MEETS,
    /** A sobrepõe o início de B */
    OVERLAPS,
    /** A começa quando B começa, mas termina antes */
    STARTS,
    /** A está completamente dentro de B */
    DURING,
    /** A termina quando B termina, mas começou depois */
    FINISHES,
    /** A e B têm exatamente o mesmo intervalo */
    EQUALS,
    /** A começa depois de B terminar */
    AFTER,
    /** A começa exatamente quando B termina */
    MET_BY,
    /** B sobrepõe o final de A */
    OVERLAPPED_BY,
    /** B começa quando A começa, mas termina depois */
    STARTED_BY,
    /** B está completamente dentro de A */
    CONTAINS,
    /** B termina quando A termina, mas começou antes */
    FINISHED_BY;

    /**
     * Classifica a relação de Allen entre dois intervalos de sequência.
     *
     * @param a Primeiro intervalo de sequência (sequência fechada)
     * @param b Segundo intervalo de sequência (sequência aberta)
     * @return A relação de Allen entre os dois intervalos
     */
    public static AllenRelation classify(StreakInterval a, StreakInterval b) {
        long as = a.getStart(), ae = a.getEnd(), bs = b.getStart(), be = b.getEnd();

        if (ae < bs) return BEFORE;
        if (ae == bs) return MEETS;
        if (as > be) return AFTER;
        if (as == be) return MET_BY;
        if (as == bs && ae == be) return EQUALS;
        if (as == bs && ae < be) return STARTS;
        if (as == bs) return STARTED_BY;
        if (ae == be && as > bs) return FINISHES;
        if (ae == be) return FINISHED_BY;
        if (as > bs && ae < be) return DURING;
        if (as < bs && ae > be) return CONTAINS;
        if (as < bs && ae > bs && ae < be) return OVERLAPS;
        return OVERLAPPED_BY;
    }

    /**
     * Verifica se esta relação é digna de nota para alertar, ou seja, se
     * representa uma sobreposição temporal significativa.
     * 
     * Relações simples como BEFORE, AFTER, MEETS e MET_BY não geram alertas
     * pois não representam uma reviravolta digna de menção.
     *
     * @return true se a relação deve gerar um alerta, false caso contrário
     */
    public boolean isNoteworthy() {
        return this != BEFORE && this != AFTER && this != MEETS && this != MET_BY;
    }
}
