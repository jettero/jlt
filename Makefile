name=JetsLocationTracker
ssh=ssh -p 2222 -l root localhost

default: test

test: clean
	@+ JLT_LOGLEVEL=99 make --no-print-directory build
	palm-install *.ipk
	$(ssh) luna-send -n 1 palm://com.palm.applicationManager/launch "'{\"id\":\"org.voltar.jlt\"}'"
	$(ssh) tail -f /var/log/messages | ./log-parse.pl -a

myinstall: clean
	@+ JLT_LOGLEVEL=0 make --no-print-directory build
	scp *.ipk $${INSTHOST:-castle.vhb}:
	ssh $${INSTHOST:-castle.vhb} /usr/bin/ipkg -o /media/cryptofs/apps install *.ipk

framework_config.json: framework_config.json.in
	@echo build $@
	@perl -pe 's/\%([\w\d]+),([\w\d]+)\%/$$ENV{ "JLT_$$1" }||$$2/eg' $< > $@

build_date:
	@ echo "\"$$(date)\"" > build_date.json

build: framework_config.json build_date
	@-rm -vf *.ipk $(name) *.tar.gz ipkgtmp*
	ln -sf ./ $(name) && \
        palm-package --exclude "*.tar.gz" --exclude .git --exclude cgi --exclude "*.ipk" \
                     --exclude $(name) --exclude contrib --exclude Makefile \
                     --exclude demo-server.pl --exclude cgi \
        $(name) && rm $(name)

README: app/views/About.html app/views/Help.html Makefile
	@ echo -----=: app/views/About.html  > README
	@ elinks -dump app/views/About.html >> README
	@ echo                              >> README
	@ echo -----=: app/views/Help.html  >> README
	@ elinks -dump app/views/Help.html  >> README
	
clean:
	git clean -dfx
