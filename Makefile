PORT ?= 8766
HOST ?= 127.0.0.1
PYTHON ?= python3
NODE ?= node
GAME_DIR := game

SRC_JS := $(wildcard $(GAME_DIR)/src/*.js)
TESTS := $(wildcard tests/*.test.mjs)

.PHONY: help serve dev url check test verify clean

help:
	@printf '%s\n' 'Block Run developer commands'
	@printf '%s\n' ''
	@printf '%-12s %s\n' 'make serve' 'Start a local static server'
	@printf '%-12s %s\n' 'make dev' 'Alias for make serve'
	@printf '%-12s %s\n' 'make url' 'Print the local game URL'
	@printf '%-12s %s\n' 'make check' 'Run Node syntax checks'
	@printf '%-12s %s\n' 'make test' 'Run all test files'
	@printf '%-12s %s\n' 'make verify' 'Run check and test'
	@printf '%-12s %s\n' 'make clean' 'Remove local transient files'

serve:
	@printf 'Serving Block Run at http://%s:%s/\n' '$(HOST)' '$(PORT)'
	cd $(GAME_DIR) && $(PYTHON) -m http.server $(PORT) --bind $(HOST)

dev: serve

url:
	@printf 'http://%s:%s/\n' '$(HOST)' '$(PORT)'

check:
	@for file in $(SRC_JS); do \
		printf 'check %s\n' "$$file"; \
		$(NODE) --check "$$file"; \
	done
	@for file in $(TESTS); do \
		printf 'check %s\n' "$$file"; \
		$(NODE) --check "$$file"; \
	done

test:
	@for file in $(TESTS); do \
		printf 'test %s\n' "$$file"; \
		$(NODE) "$$file"; \
	done

verify: check test

clean:
	@find . -name '.DS_Store' -delete
