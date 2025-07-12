# convert.py
## python-whois
import sys
import whois

domain = sys.argv[1]

def check_domain_location(domain):
    domain_info = whois.whois(domain)
    if 'country' in domain_info and domain_info['country']:
        # 强制转换为大写
        return domain_info['country'].upper()  
    return "Unknown"

print(check_domain_location(domain))