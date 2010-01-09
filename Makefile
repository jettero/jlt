name=JetsLocationTracker

default: test

test: build
	palm-install *.ipk
	/usr/local/bin/novacom/novacom -t open tty://; echo; echo

myinstall: clean build
	scp *.ipk castle.vhb:
	ssh castle.vhb

framework_config.json: framework_config.json.in
	perl -pe 's/\%([\w\d]+),([\w\d]+)\%/$$ENV{ "JLT_$$1" }||$$2/eg' $< > $@

build: framework_config.json
	@-rm -vf *.ipk $(name) *.tar.gz ipkgtmp*
	ln -sf ./ $(name) && \
        palm-package --exclude "*.tar.gz" --exclude .git --exclude cgi --exclude "*.ipk" \
                     --exclude $(name) --exclude contrib --exclude Makefile \
                     --exclude demo-server.pl --exclude cgi \
        $(name) && rm $(name)
clean:
	git clean -dfx
