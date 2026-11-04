package org.br.heretoslay.accounts.common;

import org.springframework.data.domain.Page;

import java.util.List;
import java.util.function.Function;

/** One page of results plus what a client needs to ask for the next one. */
public record PageResponse<T>(List<T> items, int page, int size, long total, int totalPages) {

    public static <E, T> PageResponse<T> from(Page<E> page, Function<E, T> mapper) {
        return new PageResponse<>(
                page.getContent().stream().map(mapper).toList(),
                page.getNumber(),
                page.getSize(),
                page.getTotalElements(),
                page.getTotalPages());
    }
}
