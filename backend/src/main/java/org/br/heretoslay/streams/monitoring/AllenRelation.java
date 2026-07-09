package org.br.heretoslay.streams.monitoring;

/**
 * The 13 relations of Allen's interval algebra, used to classify how two
 * players' luck streaks relate in time (Situação 3 - Reviravolta de Sorte).
 */
public enum AllenRelation {
    BEFORE, MEETS, OVERLAPS, STARTS, DURING, FINISHES, EQUALS,
    AFTER, MET_BY, OVERLAPPED_BY, STARTED_BY, CONTAINS, FINISHED_BY;

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

    public boolean isNoteworthy() {
        return this != BEFORE && this != AFTER && this != MEETS && this != MET_BY;
    }
}
