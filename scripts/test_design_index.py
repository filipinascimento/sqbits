import unittest
from build_design_index import material_tags,substrate_tags,reported

class Categories(unittest.TestCase):
 def test_compounds_and_electrodes(self):
  self.assertEqual(material_tags('NbTiN with aluminum'),['NbTiN','Al'])
  self.assertEqual(material_tags('niobium titanium nitride'),['NbTiN'])
  self.assertEqual(material_tags('niobium-titanium-nitride'),['NbTiN'])
  self.assertEqual(material_tags('NbN/TiN'),['NbN','TiN'])
  self.assertEqual(material_tags('Al/AlOx/Al'),['Al oxide','Al'])
  self.assertEqual(material_tags('aluminum oxide'),['Al oxide'])
  self.assertEqual(material_tags('oxygen-free copper cavity'),['Cu'])
  self.assertEqual(material_tags('aluminum lead'),['Al'])
  self.assertEqual(material_tags('lead'),['Pb'])
 def test_missing_and_explicit_absence(self):
  self.assertFalse(reported('Unknown'));self.assertTrue(reported('none'))
  self.assertEqual(material_tags('not tantalum; aluminum instead'),['Other / qualified composition'])
  self.assertEqual(material_tags('Unknown'),[])
 def test_substrate_chemistry_is_not_guessed(self):
  self.assertEqual(substrate_tags('silicon nitride'),['Silicon nitride'])
  self.assertEqual(substrate_tags('sapphire and silicon'),['Sapphire','Silicon'])
  self.assertEqual(substrate_tags('Al2O3'),['Other reported substrate'])
  self.assertEqual(substrate_tags('SiC'),['Silicon carbide'])

if __name__=='__main__':unittest.main()
