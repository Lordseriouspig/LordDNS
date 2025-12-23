// Copyright (C) 2025 Lordseriouspig
// 
// This file is part of LordDNS.
// 
// LordDNS is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
// 
// LordDNS is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.
// 
// You should have received a copy of the GNU General Public License
// along with LordDNS.  If not, see <https://www.gnu.org/licenses/>.

class FORMERR extends Error {
    constructor(message) {
        super(message);
        this.name = "FORMERR";
        this.rcode = 1
    }
}
class SRVFAIL extends Error {
    constructor(message) {
        super(message);
        this.name = "SRVFAIL";
        this.rcode = 2
    }
}
class NXDOMAIN extends Error {
    constructor(message) {
        super(message);
        this.name = "NXDOMAIN";
        this.rcode = 3
    }
}
class NOTIMP extends Error {
    constructor(message) {
        super(message);
        this.name = "NOTIMP";
        this.rcode = 4
    }
}
class REFUSED extends Error {
    constructor(message) {
        super(message);
        this.name = "REFUSED";
        this.rcode = 5
    }
}
class YXDOMAIN extends Error {
    constructor(message) {
        super(message);
        this.name = "YXDOMAIN";
        this.rcode = 6
    }
}
class YXRRSET extends Error {
    constructor(message) {
        super(message);
        this.name = "YXRRSET";
        this.rcode = 7
    }
}
class NXRRSET extends Error {
    constructor(message) {
        super(message);
        this.name = "NXRRSET";
        this.rcode = 8
    }
}
class NOTAUTH extends Error {
    constructor(message) {
        super(message);
        this.name = "NOTAUTH";
        this.rcode = 9;
    }
}
class NOTZONE extends Error {
    constructor(message) {
        super(message);
        this.name = "NOTZONE";
        this.rcode = 10;
    }
}
module.exports = {
    FORMERR,
    SRVFAIL,
    NXDOMAIN,
    NOTIMP,
    REFUSED,
    YXDOMAIN,
    YXRRSET,
    NXRRSET,
    NOTAUTH,
    NOTZONE,
};